import { DeliveryRepository } from './delivery.repository';
import { OrdersRepository } from '../orders/order.repository';
import { DeliveryRow, DeliveryStatus } from './delivery.types';
import { ControllerError } from '../../utils/errors';
import { CourierConnectionManager } from './courier-connection-manager';
import { calculateDistance } from '../../utils/geo-utils';
import { EmailService } from '../email';
import { DeliveryTokenService } from './delivery-token.service';

export interface DeliveryService {
  updateDeliveryStatus(deliveryId: number, status: DeliveryStatus, courierId: string): Promise<DeliveryRow>;
  getActiveCourierDeliveries(courierId: string): Promise<{ deliveries: DetailedDelivery[] }>;
  getDeliveryByOrderId(orderId: number): Promise<DeliveryRow | undefined>;
  getAvailableCouriers(): Promise<{ courier_id: string, active_deliveries: number }[]>;
  forceAssignDelivery(orderId: number): Promise<DeliveryRow | null>;
  getDeliveryById(deliveryId: number): Promise<DeliveryRow | undefined>;
  assignPendingDeliveries(): Promise<void>;
  getPartnerCoordinatesByDeliveryId(deliveryId: number): Promise<{ latitude: number, longitude: number, logo_url: string } | null>;
  uploadProofOfDeliveryImage(deliveryId: number, filename: string, fileBuffer: Buffer): Promise<DeliveryRow>;
}

export interface DeliveryOrderItem {
  item_name: string;
  quantity: number;
  price: number;
  note: string | null;
}

export interface DeliveryOrder {
  id: number;
  items: DeliveryOrderItem[];
  status: string;
  partner_id: number;
  tip_amount: number;
  total_amount: number;
  requested_delivery_time: string;
}

export interface DeliveryPickup {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DeliveryDropoff {
  lat: number | null;
  lng: number | null;
  phone: string | null;
  address: string | null;
  customer_name: string;
}

export interface DetailedDelivery {
  id: number;
  order_id: number;
  courier_id: string;
  status: string;
  assigned_at: Date | string;
  picked_up_at: Date | string | null;
  delivered_at: Date | string | null;
  estimated_delivery_time: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  order: DeliveryOrder;
  pickup: DeliveryPickup;
  delivery: DeliveryDropoff;
}

export const createDeliveryService = (
  deliveryRepository: DeliveryRepository,
  ordersRepository: OrdersRepository,
  connectionManager: CourierConnectionManager,
  emailService: EmailService,
  deliveryTokenService: DeliveryTokenService
): DeliveryService => {
  const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    'assigned': ['picked_up', 'failed', 'canceled'],
    'picked_up': ['in_transit', 'failed', 'canceled'],
    'in_transit': ['delivered', 'failed', 'canceled'],
    'delivered': [], // Terminal state
    'failed': [],    // Terminal state
    'canceled': []   // Terminal state
  };

  const isValidStatusTransition = (currentStatus: DeliveryStatus, newStatus: DeliveryStatus): boolean => {
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  };

  return {
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

    async getDeliveryById(deliveryId: number): Promise<DeliveryRow | undefined> {
      return deliveryRepository.findDeliveryById(deliveryId);
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
        const updatedDelivery = await deliveryRepository.directUpdateDeliveryStatus(deliveryId, status);

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

        if (status === 'picked_up') {
          const order = await ordersRepository.findOrderById(existingDelivery.order_id);
          if (order && order.partner_id) {
            const { broadcastPartnerMessage } = await import('../partner/partner.ws');
            broadcastPartnerMessage(order.partner_id, {
              type: 'order_picked_up',
              data: {
                orderId: order.id,
                deliveryId: updatedDelivery.id,
                status: status,
                timestamp: new Date().toISOString()
              }
            });
            console.log(`Notified partner ${order.partner_id} about pickup of order ${order.id}`);
          }
        }

        return updatedDelivery;
      } catch (error) {
        console.error(`Error updating delivery status for #${deliveryId}:`, error);
        throw error;
      }
    },

    async getActiveCourierDeliveries(courierId: string): Promise<{ deliveries: DetailedDelivery[] }> {
      try {
        const deliveries = await deliveryRepository.findDetailedDeliveriesByCourier(courierId);
        return { deliveries };
      } catch (error) {
        console.error(`Error getting active deliveries for courier ${courierId}:`, error);
        return { deliveries: [] };
      }
    },

    async getDeliveryByOrderId(orderId: number): Promise<DeliveryRow | undefined> {
      return deliveryRepository.findDeliveryByOrderId(orderId);
    },

    async getAvailableCouriers(): Promise<{ courier_id: string, active_deliveries: number }[]> {
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
        const availableCouriers = await deliveryRepository.getAvailableCouriers();
        const idleCouriers = availableCouriers.filter(c => c.active_deliveries === 0);
        if (!partner || !partner.latitude || !partner.longitude) {
          console.log(`Cannot get partner location for order ${orderId}, using standard assignment`);

          if (!idleCouriers.length) return null;
          const bestCourier = idleCouriers[0];
        } else {
          console.log(`Partner location found for order ${orderId}:`, partner);
          console.log(`Idle couriers for order ${orderId}:`, idleCouriers);
          if (!idleCouriers.length) {
            console.log(`No idle couriers available for order ${orderId}`);
            return null;
          }

          const courierLocationPromises: Array<{
            courierId: string,
            locationPromise: Promise<{ lat: number, lng: number } | null>
          }> = [];

          // Request location from each idle courier
          for (const courier of idleCouriers) {
            if (this.isConnected(courier.courier_id)) {
              console.log(`Requesting location from courier ${courier.courier_id}`);
              const locationPromise = new Promise<{ lat: number, lng: number } | null>((resolve) => {
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
                    console.log(`Ignoring non-location message from courier ${courier.courier_id}: ${data.type}`);
                    return false;
                  } catch (e) {
                    console.error(`Error parsing message from courier ${courier.courier_id}:`, e);
                    return false;
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
          let bestCourier = idleCouriers[0];
          let shortestDistance = Infinity;

          for (const { courierId, locationPromise } of courierLocationPromises) {
            console.log(`locationPromise for courier ${courierId}`);
            const location = await locationPromise;
            console.log(`Waiting for locationPromise for courier ${location}`);
            if (location) {
              const distance = calculateDistance(
                partner.latitude,
                partner.longitude,
                location.lat,
                location.lng,
              );
              console.log(`Distance from partner to courier ${courierId}: ${distance} km`);
              if (distance < shortestDistance) {
                shortestDistance = distance;
                bestCourier = idleCouriers.find(c => c.courier_id === courierId) || bestCourier;
                console.log(location.lat, location.lng);
              }
            }
          }

          console.log(`shortestDistance: ${shortestDistance}`);
          console.log(`partner.max_delivery_distance_km: ${partner.max_delivery_distance_km}`);

          if (shortestDistance <= partner.max_delivery_distance_km) {
            console.log(`partner.max_delivery_distance_km: ${partner.max_delivery_distance_km}`);
            const estimatedDeliveryTime = order.requested_delivery_time ||
              new Date(Date.now() + 30 * 60 * 1000);
            console.log(`Partner location: ${partner.latitude}, ${partner.longitude}`);
            console.log(`Best courier: ${bestCourier.courier_id}`);
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

            const activeDeliveries = await this.getActiveCourierDeliveries(bestCourier.courier_id);

            if (this.isConnected(bestCourier.courier_id)) {
              await this.notifyCourier(bestCourier.courier_id, 'delivery_assigned', {
                delivery_id: delivery.id,
                order_id: orderId,
                status: delivery.status,
                estimated_delivery_time: delivery.estimated_delivery_time,
                deliveries: activeDeliveries.deliveries
              });
            }

            const customerEmail = await ordersRepository.getOrderCustomerEmail(orderId);
            
            if (customerEmail) {
              const trackingToken = deliveryTokenService.generateToken(delivery.id, orderId);
              
              await emailService.sendOrderTrackingEmail(customerEmail, orderId, trackingToken);

              
              console.log(`Sent tracking email for order #${orderId} to ${customerEmail}`);
            }

            return delivery;
          } else {
            return null;
          }
        }
      } catch (error) {
        console.error(`Error force assigning delivery for order ${orderId}:`, error);
        return null;
      }
    },
    async getPartnerCoordinatesByDeliveryId(deliveryId: number): Promise<{ latitude: number, longitude: number, logo_url: string } | null> {
      try {
        const delivery = await deliveryRepository.findDeliveryById(deliveryId);
        if (!delivery) {
          console.log(`Delivery ${deliveryId} not found`);
          return null;
        }

        const order = await ordersRepository.findOrderById(delivery.order_id);
        if (!order || !order.partner_id) {
          console.log(`Order for delivery ${deliveryId} not found or has no partner`);
          return null;
        }

        const partner = await ordersRepository.getPartnerById(order.partner_id);
        if (!partner || !partner.latitude || !partner.longitude) {
          console.log(`Partner location for delivery ${deliveryId} not found`);
          return null;
        }

        return {
          latitude: partner.latitude,
          longitude: partner.longitude,
          logo_url: partner.logo_url || ''
        };
      } catch (error) {
        console.error(`Error getting partner coordinates for delivery ${deliveryId}:`, error);
        return null;
      }
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
    },
    async uploadProofOfDeliveryImage(deliveryId: number, filename: string, fileBuffer: Buffer): Promise<DeliveryRow> {
      try {
        // Verify the courier is assigned to this delivery
        const delivery = await deliveryRepository.findDeliveryById(deliveryId);

        if (!delivery) {
          throw Error(`Delivery with ID ${deliveryId} not found`);
        }

        // Handle file storage
        const path = require('path');
        const fs = require('fs');

        const timestamp = Date.now();
        const extension = filename.split('.').pop()?.toLowerCase();
        const safeFilename = `delivery_${deliveryId}_${timestamp}.${extension}`;

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'delivery-proofs');

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, safeFilename);

        await fs.promises.writeFile(filePath, fileBuffer);

        const imageUrl = `/uploads/delivery-proofs/${safeFilename}`;

        await deliveryRepository.updateProofOfDelivery(deliveryId, imageUrl);
      } catch (error) {
        console.error(`Error uploading proof of delivery for #${deliveryId}:`, error);
        throw error;
      }
    }
  };
};
