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
        
          console.log(` 213 Assigning delivery for order ${orderId} to courier ${courierId}`);
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
        // Use the new detailed method instead of the basic one
        return await deliveryRepository.transaction(async (trx) => {
          return await trx.findDetailedDeliveriesByCourier(courierId);
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
        console.log(`Force assigning delivery for order ${orderId}`);
        if (!order || order.delivery_type !== 'delivery') {
          console.log(`Order ${orderId} is not a delivery type or does not exist`);
          return null;
        }
        
        // Get partner location from the order
        const partner = await ordersRepository.getPartnerById(order.partner_id);
        console.log(`Partner location for order ${orderId}:`, partner);
        if (!partner || !partner.latitude || !partner.longitude) {
          console.log(`Cannot get partner location for order ${orderId}, using standard assignment`);
          const availableCouriers = await deliveryRepository.getAvailableCouriers();
          const idleCouriers = availableCouriers.filter(c => c.active_deliveries === 0);
          if (!idleCouriers.length) return null;
          const bestCourier = idleCouriers[0];
          // Continue with standard assignment...
        } else {
          console.log(`Partner location found for order ${orderId}:`, partner);
          // Get all available couriers
          const availableCouriers = await deliveryRepository.getAvailableCouriers();
          const idleCouriers = availableCouriers.filter(c => c.active_deliveries === 0);
          console.log(`Idle couriers for order ${orderId}:`, idleCouriers);
          if (!idleCouriers.length) {
            console.log(`No idle couriers available for order ${orderId}`);
            return null;
          }
          
          // Create a tracking structure for courier locations
          const courierLocationPromises: Array<{
            courierId: string,
            locationPromise: Promise<{lat: number, lng: number} | null>
          }> = [];
          
          // Request location from each idle courier
          for (const courier of idleCouriers) {
            if (this.isConnected(courier.courier_id)) {
              console.log(`Requesting location from courier ${courier.courier_id}`);
              const locationPromise = new Promise<{lat: number, lng: number} | null>((resolve) => {
                // Set up listener for one-time location response
                const locationListener = (event: any) => {
                  try {
                    // Parse the message data correctly from the event
                    const rawData = event.data || event.toString();
                    console.log(`Raw message from courier ${courier.courier_id}:`, typeof rawData, rawData.slice(0, 100));
                    
                    const data = JSON.parse(rawData);
                    console.log(`Parsed message from courier ${courier.courier_id}:`, data);
                    
                    if (data.type === 'location_response') {
                      console.log(`✅ Received location response from courier ${courier.courier_id}:`, data.payload);
                      resolve({
                        lat: data.payload.latitude,
                        lng: data.payload.longitude
                      });
                      return true; // Remove listener
                    } else if (data.type === 'location_error') {
                      console.log(`❌ Received location error from courier ${courier.courier_id}:`, data.payload);
                      resolve(null);
                      return true; // Remove listener
                    }
                    // For other message types, keep the listener active
                    console.log(`Ignoring non-location message from courier ${courier.courier_id}: ${data.type}`);
                    return false;
                  } catch (e) {
                    console.error(`Error parsing message from courier ${courier.courier_id}:`, e);
                    return false; // Keep listener on error
                  }
                };
                
                // Send location request via WebSocket
                this.notifyCourier(courier.courier_id, 'location_request', { 
                  request_id: orderId,
                  timestamp: new Date().toISOString() 
                });
                
                console.log(`Sent location request to courier ${courier.courier_id}`);
                
                // Add temporary listener to the courier's socket
                const courierConnection = connectionManager.getConnection(courier.courier_id);
                if (courierConnection && courierConnection.socket) {
                  console.log(`Adding location listener for courier ${courier.courier_id}`);
                  
                  // For WebSockets, we need to properly handle the 'message' event
                  courierConnection.socket.on('message', locationListener);
                  
                  console.log(`Waiting for location response from courier ${courier.courier_id}`);
                  
                  // Remove listener after timeout
                  setTimeout(() => {
                    console.log(`Location request timed out for courier ${courier.courier_id}`);
                    try {
                      courierConnection.socket.removeListener('message', locationListener);
                    } catch (e) {
                      console.error(`Error removing listener for courier ${courier.courier_id}:`, e);
                    }
                    resolve(null); // Resolve with null if no response
                  }, 5000); // 5-second timeout
                } else {
                  console.log(`No active socket for courier ${courier.courier_id}`);
                  resolve(null);
                }
              });
              
              courierLocationPromises.push({ 
                courierId: courier.courier_id, 
                locationPromise 
              });
            }
          }
          
          // Wait for all promises to resolve (with 5-second max wait time)
          const timeout = new Promise(resolve => setTimeout(resolve, 5000));
          const racePromise = Promise.race([
            Promise.all(courierLocationPromises.map(item => item.locationPromise)),
            timeout.then(() => null)
          ]);
          
          // Wait for responses or timeout
          await racePromise;
          
          // Calculate distances and find closest courier
          let bestCourier = idleCouriers[0]; // Default to first courier
          let shortestDistance = Infinity;
          
          for (const { courierId, locationPromise } of courierLocationPromises) {
            console.log(`locationPromise for courier ${courierId}`);
            const location = await locationPromise;
                console.log(`Waiting for locationPromise for courier ${location}`);
            if (location) {
              // Calculate distance using Haversine formula
              const distance = this.calculateDistance(
                partner.latitude, 
                partner.longitude, 
                location.lat, 
                location.lng,
              );
              console.log(`Distance from partner to courier ${courierId}: ${distance} km`);
              if (distance < shortestDistance && distance < partner.max_delivery_distance_km) {
                shortestDistance = distance;
                bestCourier = idleCouriers.find(c => c.courier_id === courierId) || bestCourier;
              }
            }
          }
          
          const estimatedDeliveryTime = order.requested_delivery_time || 
            new Date(Date.now() + 30 * 60 * 1000);
          console.log(`Partner location: ${partner.latitude}, ${partner.longitude}`);
          console.log(`Best courier: ${bestCourier.courier_id}`);
          console.log(`Best courier location: ${bestCourier.latitude}, ${bestCourier.longitude}`);
          console.log(`Distance to best courier: ${shortestDistance} km`);
          console.log(`Estimated delivery time: ${estimatedDeliveryTime}`);
          console.log(`Courier location: ${bestCourier.lat}, ${bestCourier.lng}`);
            console.log(` 434 Assigning delivery for order ${orderId} to courier ${bestCourier.courier_id}`);
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
        }
      } catch (error) {
        console.error(`Error force assigning delivery for order ${orderId}:`, error);
        return null;
      }
    },
    
    // Helper function to calculate distance using Haversine formula
    // Add this function to the delivery service object
    calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const distance = R * c; // Distance in km
      return distance;
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
          await this.forceAssignDelivery(order.id);
        }
      } catch (error) {
        console.error('Error in assignPendingDeliveries:', error);
      }
    }
  };
};
