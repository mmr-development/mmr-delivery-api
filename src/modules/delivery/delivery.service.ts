import { DeliveryRepository } from './delivery.repository';
import { OrdersRepository } from '../orders/order.repository';
import { CourierConnection, DeliveryRow, DeliveryStatus } from './delivery.types';
import { ControllerError } from '../../utils/errors';

// Define the DeliveryService interface
export interface DeliveryService {
  // Connection management methods
  registerCourierConnection(courierId: string, socket: any): void;
  handleCourierDisconnection(courierId: string): void;
  isConnected(courierId: string): boolean;
  getConnectedCouriers(): string[];
  cleanStaleConnections(): void;
  updateCourierLocation(courierId: string, latitude: number, longitude: number): Promise<void>;
  notifyCourier(courierId: string, messageType: string, data: any): Promise<boolean>;
  
  // Delivery management methods
  findAvailableCourier(): Promise<string | null>;
  assignDeliveryAutomatically(orderId: number): Promise<DeliveryRow | null>;
  updateDeliveryStatus(deliveryId: number, status: DeliveryStatus, courierId: string): Promise<DeliveryRow>;
  getCourierDeliveries(courierId: string): Promise<DeliveryRow[]>;
  getActiveCourierDeliveries(courierId: string): Promise<DeliveryRow[]>;
  getDeliveryByOrderId(orderId: number): Promise<DeliveryRow | undefined>;
  getAvailableCouriers(): Promise<{courier_id: string, active_deliveries: number}[]>;
  forceAssignDelivery(orderId: number): Promise<DeliveryRow | null>;
  checkAndAssignDelivery(orderId: number): Promise<DeliveryRow | null>;
  assignPendingDeliveries(): Promise<void>;
}

// Create WebSocket manager as a separate concern
const createCourierConnectionManager = () => {
  // Keep track of connected couriers
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
      // Find couriers who haven't been active in 3 minutes
      for (const [courierId, connection] of connectedCouriers.entries()) {
        const inactiveTime = now.getTime() - connection.lastActive.getTime();
        if (inactiveTime > 3 * 60 * 1000 || connection.socket.readyState !== 1) {
          console.log(`Removing stale connection for courier ${courierId}, inactive for ${inactiveTime/1000}s`);
          this.handleDisconnection(courierId);
        }
      }
    }
  };
};

// Create delivery service as a factory function
export const createDeliveryService = (
  deliveryRepository: DeliveryRepository,
  ordersRepository: OrdersRepository
): DeliveryService => {
  const connectionManager = createCourierConnectionManager();
  
  // Define valid status transitions - moved outside of functions for reuse and clarity
  const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    'assigned': ['picked_up', 'failed', 'canceled'],
    'picked_up': ['in_transit', 'failed', 'canceled'],
    'in_transit': ['delivered', 'failed', 'canceled'],
    'delivered': [], // Terminal state
    'failed': [],    // Terminal state
    'canceled': []   // Terminal state
  };
  
  // Helper function to check if status transition is valid
  const isValidStatusTransition = (currentStatus: DeliveryStatus, newStatus: DeliveryStatus): boolean => {
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  };
  
  return {
    // Connection management methods
    registerCourierConnection(courierId: string, socket: any): void {
      connectionManager.registerConnection(courierId, socket);
    },
    
    handleCourierDisconnection(courierId: string): void {
      connectionManager.handleDisconnection(courierId);
    },
    
    isConnected(courierId: string): boolean {
      return connectionManager.isConnected(courierId);
    },
    
    getConnectedCouriers(): string[] {
      return connectionManager.getConnectedCourierIds();
    },
    
    cleanStaleConnections(): void {
      connectionManager.cleanStaleConnections();
    },
    
    async updateCourierLocation(courierId: string, latitude: number, longitude: number): Promise<void> {
      connectionManager.updateLastActive(courierId);
      
      await deliveryRepository.updateCourierLocation({
        courier_id: courierId,
        latitude,
        longitude
      });
    },
    
    async notifyCourier(courierId: string, messageType: string, data: any): Promise<boolean> {
      const courier = connectionManager.getConnection(courierId);
      if (!courier || !courier.socket) {
        console.log(`Cannot notify courier ${courierId}: Not connected`);
        return false;
      }
      
      // Verify socket is open (readyState 1 = OPEN)
      if (courier.socket.readyState !== 1) {
        console.log(`Courier ${courierId} socket not open (state: ${courier.socket.readyState}), removing stale connection`);
        connectionManager.handleDisconnection(courierId);
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
        connectionManager.updateLastActive(courierId);
        return true;
      } catch (error) {
        console.error(`Failed to send message to courier ${courierId}:`, error);
        connectionManager.handleDisconnection(courierId);
        return false;
      }
    },
    
    // Delivery management methods
    async findAvailableCourier(): Promise<string | null> {
      try {
        const availableCouriers = await deliveryRepository.getAvailableCouriers();
        
        const connectedAvailableCouriers = availableCouriers
          .filter(c => connectionManager.isConnected(c.courier_id) && c.active_deliveries === 0);
        
        if (connectedAvailableCouriers.length === 0) {
          return null;
        }
        
        return connectedAvailableCouriers[0].courier_id;
      } catch (error) {
        console.error('Error finding available courier:', error);
        return null;
      }
    },
    
    async assignDeliveryAutomatically(orderId: number): Promise<DeliveryRow | null> {
      try {
        // Check if order exists and is eligible for delivery
        const order = await ordersRepository.findOrderById(orderId);
        
        if (!order || order.delivery_type !== 'delivery' || 
            !['confirmed', 'preparing', 'ready'].includes(order.status)) {
          return null;
        }
        
        // Check if delivery already exists
        const existingDelivery = await deliveryRepository.findDeliveryByOrderId(orderId);
        if (existingDelivery) {
          return existingDelivery;
        }
        
        const courierId = await this.findAvailableCourier();
        if (!courierId) {
          return null;
        }
        
        // Create delivery
        const estimatedDeliveryTime = order.requested_delivery_time || 
          new Date(Date.now() + 30 * 60 * 1000);
        
        const delivery = await deliveryRepository.createDelivery({
          order_id: orderId,
          courier_id: courierId,
          status: 'assigned',
          picked_up_at: null,
          delivered_at: null,
          estimated_delivery_time: estimatedDeliveryTime
        });
        
        // Notify courier
        await this.notifyCourier(courierId, 'delivery_assigned', {
          delivery_id: delivery.id,
          order_id: orderId,
          status: delivery.status,
          estimated_delivery_time: delivery.estimated_delivery_time
        });
        
        return delivery;
      } catch (error) {
        console.error(`Error assigning delivery for order ${orderId}:`, error);
        return null;
      }
    },
    
    async updateDeliveryStatus(
      deliveryId: number, 
      status: DeliveryStatus, 
      courierId: string
    ): Promise<DeliveryRow> {
      const existingDelivery = await deliveryRepository.findDeliveryById(deliveryId);
      
      if (!existingDelivery) {
        throw new ControllerError(404, 'DeliveryNotFound', 'Delivery not found');
      }
      
      // Check courier authorization
      if (existingDelivery.courier_id !== courierId) {
        throw new ControllerError(403, 'Unauthorized', 'You are not authorized to update this delivery');
      }
      
      // Check if status transition is valid
      if (!isValidStatusTransition(existingDelivery.status, status)) {
        throw new ControllerError(400, 'InvalidStatusTransition', 
          `Cannot change delivery status from '${existingDelivery.status}' to '${status}'`);
      }
      
      try {
        // Update delivery status
        const updatedDelivery = await deliveryRepository.directUpdateDeliveryStatus(deliveryId, status);
        
        // Update order status based on delivery status
        const orderStatusMap = {
          'picked_up': 'dispatched',
          'delivered': 'delivered',
          'failed': 'failed',
          'canceled': 'failed'
        };
        
        if (Object.keys(orderStatusMap).includes(status)) {
          await ordersRepository.updateOrder(existingDelivery.order_id, { 
            status: orderStatusMap[status as keyof typeof orderStatusMap]
          });
        }
        
        return updatedDelivery;
      } catch (error) {
        console.error(`Error updating delivery status for #${deliveryId}:`, error);
        throw error;
      }
    },
    
    async getCourierDeliveries(courierId: string): Promise<DeliveryRow[]> {
      return deliveryRepository.findDeliveriesByCourier(courierId);
    },
    
    async getActiveCourierDeliveries(courierId: string): Promise<DeliveryRow[]> {
      try {
        return await deliveryRepository.transaction(async (trx) => {
          return await trx.findActiveDeliveriesByCourier(courierId);
        });
      } catch (error) {
        console.error(`Error getting active deliveries for courier ${courierId}:`, error);
        return [];
      }
    },
    
    async getDeliveryByOrderId(orderId: number): Promise<DeliveryRow | undefined> {
      return deliveryRepository.findDeliveryByOrderId(orderId);
    },
    
    async getAvailableCouriers(): Promise<{courier_id: string, active_deliveries: number}[]> {
      try {
        return await deliveryRepository.getAvailableCouriers();
      } catch (error) {
        console.error('Error getting available couriers:', error);
        return [];
      }
    },
    
    async forceAssignDelivery(orderId: number): Promise<DeliveryRow | null> {
      try {
        const order = await ordersRepository.findOrderById(orderId);
        
        if (!order || order.delivery_type !== 'delivery') {
          return null;
        }
        
        const existingDelivery = await deliveryRepository.findDeliveryByOrderId(orderId);
        if (existingDelivery) {
          return existingDelivery;
        }
        
        const availableCouriers = await deliveryRepository.getAvailableCouriers();
        const idleCouriers = availableCouriers.filter(c => c.active_deliveries === 0);
        
        if (!idleCouriers.length) {
          return null;
        }
        
        const bestCourier = idleCouriers[0];
        const estimatedDeliveryTime = order.requested_delivery_time || 
          new Date(Date.now() + 30 * 60 * 1000);
        
        const delivery = await deliveryRepository.createDelivery({
          order_id: orderId,
          courier_id: bestCourier.courier_id,
          status: 'assigned',
          picked_up_at: null,
          delivered_at: null,
          estimated_delivery_time: estimatedDeliveryTime
        });
        
        // Try to notify courier if connected
        if (this.isConnected(bestCourier.courier_id)) {
          await this.notifyCourier(bestCourier.courier_id, 'delivery_assigned', {
            delivery_id: delivery.id,
            order_id: orderId,
            status: delivery.status,
            estimated_delivery_time: delivery.estimated_delivery_time
          });
        }
        
        return delivery;
      } catch (error) {
        console.error(`Error force assigning delivery for order ${orderId}:`, error);
        return null;
      }
    },
    
    async checkAndAssignDelivery(orderId: number): Promise<DeliveryRow | null> {
      const existingDelivery = await deliveryRepository.findDeliveryByOrderId(orderId);
      if (existingDelivery) {
        return existingDelivery;
      }
      
      const order = await ordersRepository.findOrderById(orderId);
      if (!order || order.delivery_type !== 'delivery' || 
          !['confirmed', 'preparing', 'ready'].includes(order.status)) {
        return null;
      }
      
      return await this.forceAssignDelivery(orderId);
    },
    
    async assignPendingDeliveries(): Promise<void> {
      try {
        const orders = await deliveryRepository.findOrdersReadyForDelivery(5);
        
        for (const order of orders) {
          await this.assignDeliveryAutomatically(order.id);
        }
      } catch (error) {
        console.error('Error in assignPendingDeliveries:', error);
      }
    }
  };
};
