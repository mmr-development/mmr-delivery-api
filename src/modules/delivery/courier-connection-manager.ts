import { CourierConnection } from '../delivery/delivery.types';

export interface CourierConnectionManager {
  registerConnection(courierId: string, socket: any): void;
  handleDisconnection(courierId: string): void;
  isConnected(courierId: string): boolean;
  getConnectedCourierIds(): string[];
  updateLastActive(courierId: string): void;
  getConnection(courierId: string): CourierConnection | undefined;
  cleanStaleConnections(): void;
  notifyCourier(courierId: string, messageType: string, data: any): Promise<boolean>;
}

export const createCourierConnectionManager = (): CourierConnectionManager => {
  const connectedCouriers = new Map<string, CourierConnection>();

  return {
    registerConnection(courierId: string, socket: any): void {
      console.log(`Courier ${courierId} connected to WebSocket`);
      connectedCouriers.set(courierId, {
        courierId,
        socket,
        lastActive: new Date()
      });
    },

    handleDisconnection(courierId: string): void {
      console.log(`Courier ${courierId} disconnected from WebSocket`);
      connectedCouriers.delete(courierId);
    },

    isConnected(courierId: string): boolean {
      return connectedCouriers.has(courierId);
    },

    getConnectedCourierIds(): string[] {
      return Array.from(connectedCouriers.keys());
    },

    updateLastActive(courierId: string): void {
      const courier = connectedCouriers.get(courierId);
      if (courier) {
        courier.lastActive = new Date();
      }
    },

    getConnection(courierId: string): CourierConnection | undefined {
      return connectedCouriers.get(courierId);
    },

    cleanStaleConnections(): void {
      const now = new Date();
      for (const [courierId, connection] of connectedCouriers.entries()) {
        const inactiveTime = now.getTime() - connection.lastActive.getTime();
        if (inactiveTime > 3 * 60 * 1000 || connection.socket.readyState !== 1) {
          console.log(`Removing stale connection for courier ${courierId}, inactive for ${inactiveTime / 1000}s`);
          this.handleDisconnection(courierId);
        }
      }
    },

    async notifyCourier(courierId: string, messageType: string, data: any): Promise<boolean> {
      const courier = this.getConnection(courierId);
      if (!courier || !courier.socket) {
        console.log(`Cannot notify courier ${courierId}: Not connected`);
        return false;
      }

      if (courier.socket.readyState !== 1) {
        console.log(`Courier ${courierId} socket not open (state: ${courier.socket.readyState}), removing stale connection`);
        this.handleDisconnection(courierId);
        return false;
      }

      const message = {
        type: messageType,
        payload: data,
        timestamp: new Date().toISOString()
      };

      try {
        courier.socket.send(JSON.stringify(message));
        console.log(`Successfully sent ${messageType} notification to courier ${courierId}`);
        this.updateLastActive(courierId);
        return true;
      } catch (error) {
        console.error(`Failed to send message to courier ${courierId}:`, error);
        this.handleDisconnection(courierId);
        return false;
      }
    }
  };
};
