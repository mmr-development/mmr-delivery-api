import { DeliveryRepository } from './delivery.repository';
import { 
    CourierAvailabilityRow, 
    CourierLocation, 
    DeliveryRow, 
    DeliveryStatus,
    DeliveryWithOrderDetails, 
    InsertableCourierAvailabilityRow, 
    InsertableCourierLocationRow, 
    InsertableDeliveryRow, 
    UpdateableDeliveryRow 
} from './delivery.tables';
import { OrderService } from '../orders/order.service';
import { ControllerError } from '../../utils/errors';
import { broadcastToDeliveryCouriers } from './delivery.ws';
import { calculateDistance } from '../../utils/geo-utils';
import { OrdersRepository } from '../orders/order.repository';

export interface DeliveryService {
    assignDelivery(orderId: number): Promise<DeliveryRow>;
    acceptDelivery(deliveryId: number, courierId: string): Promise<DeliveryRow>;
    updateDeliveryStatus(deliveryId: number, status: DeliveryStatus, courierId: string): Promise<DeliveryRow>;
    getDeliveriesForCourier(courierId: string): Promise<DeliveryRow[]>;
    getAvailableDeliveries(): Promise<DeliveryWithOrderDetails[]>;
    updateCourierLocation(location: InsertableCourierLocationRow): Promise<CourierLocation>;
    getCourierLocation(courierId: string): Promise<CourierLocation | null>;
    setCourierAvailability(courierId: string, isAvailable: boolean, isWorking?: boolean): Promise<CourierAvailabilityRow>;
    getDeliveryLocations(deliveryId: number): Promise<{
        pickup: { latitude: number, longitude: number } | null,
        dropoff: { latitude: number, longitude: number } | null
    }>;
    findNearestCourier(restaurantLatitude: number, restaurantLongitude: number): Promise<string | null>;
    assignDeliveryAutomatically(orderId: number): Promise<DeliveryRow | null>;
    isAvailableForDelivery(courierId: string): Promise<boolean>;
    autoAssignDelivery(orderId: number): Promise<DeliveryRow | null>;
    findAndAssignPendingDeliveries(): Promise<DeliveryRow[]>;
    checkAndAssignDeliveriesToCourier(courierId: string): Promise<DeliveryRow | null>;
}

export const createDeliveryService = (
    deliveryRepository: DeliveryRepository,
    orderService: OrderService,
    ordersRepository?: OrdersRepository // Optional for backward compatibility
): DeliveryService => {
    return {
        async assignDelivery(orderId: number): Promise<DeliveryRow> {
            // Check if order exists
            const order = await orderService.findOrderById(orderId);
            if (!order) {
                throw new ControllerError(404, 'OrderNotFound', 'Order not found');
            }

            // Get restaurant location
            const restaurantLocation = await deliveryRepository.getOrderDeliveryLocation(orderId);
            if (!restaurantLocation) {
                throw new ControllerError(404, 'LocationNotFound', 'Restaurant location not found');
            }

            // Find the nearest courier who isn't already handling a delivery
            let availableCouriers = await deliveryRepository.getAvailableCouriersWithoutActiveDelivery();
            if (availableCouriers.length === 0) {
                throw new ControllerError(400, 'NoCouriersAvailable', 'No available couriers found');
            }
            
            let nearestCourierId: string;
            
            // If we have location data, find the closest courier
            if (restaurantLocation.latitude && restaurantLocation.longitude) {
                const courierLocations = await Promise.all(
                    availableCouriers.map(async (courierId) => {
                        const location = await deliveryRepository.getCourierLocation(courierId);
                        return { 
                            courierId, 
                            location: location || null 
                        };
                    })
                );
                
                // Filter only couriers with known locations
                const couriersWithLocation = courierLocations.filter(
                    c => c.location !== null
                );
                
                if (couriersWithLocation.length > 0) {
                    // Calculate distances
                    const couriersWithDistance = couriersWithLocation.map(c => ({
                        courierId: c.courierId,
                        distance: calculateDistance(
                            restaurantLocation.latitude,
                            restaurantLocation.longitude,
                            c.location.latitude,
                            c.location.longitude
                        )
                    }));
                    
                    // Sort by distance (closest first)
                    couriersWithDistance.sort((a, b) => a.distance - b.distance);
                    nearestCourierId = couriersWithDistance[0].courierId;
                } else {
                    // If no couriers have location data, pick the first available
                    nearestCourierId = availableCouriers[0];
                }
            } else {
                // If we don't have restaurant location, use the first available courier
                nearestCourierId = availableCouriers[0];
            }

            // Create a delivery record
            const delivery = await deliveryRepository.createDelivery({
                order_id: orderId,
                courier_id: nearestCourierId,
                status: 'assigned',
                estimated_delivery_time: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            });

            // Notify couriers about new delivery
            await broadcastToDeliveryCouriers('delivery_assigned_auto', {
                deliveryId: delivery.id,
                orderId: delivery.order_id,
                status: delivery.status,
                courier_id: nearestCourierId
            });

            return delivery;
        },

        async acceptDelivery(deliveryId: number, courierId: string): Promise<DeliveryRow> {
            const delivery = await deliveryRepository.getDeliveryById(deliveryId);

            if (delivery.status !== 'assigned') {
                throw new ControllerError(400, 'InvalidDeliveryStatus', 'Delivery can no longer be accepted');
            }

            // Update the delivery with accepted status
            const updatedDelivery = await deliveryRepository.updateDelivery(deliveryId, {
                status: 'accepted',
                courier_id: courierId,
                accepted_at: new Date()
            });

            // Update the order status to indicate it's being delivered
            await orderService.updateOrder(delivery.order_id, { status: 'dispatched' });

            return updatedDelivery;
        },

        async updateDeliveryStatus(deliveryId: number, status: DeliveryStatus, courierId: string): Promise<DeliveryRow> {
            const delivery = await deliveryRepository.getDeliveryById(deliveryId);

            // Verify the courier is the assigned courier
            if (delivery.courier_id !== courierId) {
                throw new ControllerError(403, 'UnauthorizedCourier', 'Not authorized to update this delivery');
            }

            const updateData: UpdateableDeliveryRow = { status };

            // Add timestamp based on status
            if (status === 'picked_up') {
                updateData.picked_up_at = new Date();
            } else if (status === 'delivered') {
                const now = new Date();
                updateData.delivered_at = now;
                // Update order status
                await orderService.updateOrder(delivery.order_id, { status: 'delivered' });
                
                // After delivery completion, check if courier is available for new assignments
                console.log(`Delivery #${deliveryId} marked as delivered by courier ${courierId}, checking availability for new assignments`);
                
                setTimeout(() => {
                    this.refreshCourierAvailability(courierId).catch(err => {
                        console.error(`Error refreshing availability for courier ${courierId}:`, err);
                    });
                }, 1000); // Small delay to ensure database updates are complete
            } else if (status === 'failed' || status === 'canceled') {
                // Handle failed/canceled deliveries
                await orderService.updateOrder(delivery.order_id, { status: 'cancelled' });
                
                // Also check for new assignments after cancellation
                setTimeout(() => {
                    this.refreshCourierAvailability(courierId).catch(err => {
                        console.error(`Error refreshing availability for courier ${courierId}:`, err);
                    });
                }, 1000);
            }

            // Update delivery record
            const updatedDelivery = await deliveryRepository.updateDelivery(deliveryId, updateData);

            // Notify about status update
            await broadcastToDeliveryCouriers('delivery_status_update', {
                deliveryId: updatedDelivery.id,
                orderId: updatedDelivery.order_id,
                status: updatedDelivery.status,
                courierAvailableForNewDeliveries: ['delivered', 'failed', 'canceled'].includes(status)
            });

            return updatedDelivery;
        },

        async refreshCourierAvailability(courierId: string): Promise<boolean> {
            try {
                // Check if courier is still marked as available and working
                const availability = await deliveryRepository.getCourierAvailability(courierId);
                if (!availability || !availability.is_available || !availability.is_working) {
                    console.log(`Courier ${courierId} is not available/working, skipping availability refresh`);
                    return false;
                }

                // Get current active deliveries
                const activeDeliveryCount = await deliveryRepository.getCourierActiveDeliveryCount(courierId);
                const isAvailable = activeDeliveryCount === 0;

                console.log(`Refreshing courier ${courierId} availability: has ${activeDeliveryCount} active deliveries, available: ${isAvailable}`);

                if (isAvailable) {
                    // Notify courier they're available for new assignments
                    await broadcastToDeliveryCouriers('courier_available_for_delivery', {
                        courier_id: courierId,
                        status: 'ready_for_new_delivery',
                        timestamp: new Date().toISOString()
                    });
                    
                    // Try to find a pending delivery to assign
                    if (ordersRepository) {
                        const assignedDelivery = await this.checkAndAssignDeliveriesToCourier(courierId);
                        if (assignedDelivery) {
                            console.log(`Auto-assigned new delivery #${assignedDelivery.id} to courier ${courierId}`);
                        } else {
                            console.log(`No pending deliveries found for courier ${courierId}`);
                        }
                    }
                }

                return isAvailable;
            } catch (error) {
                console.error(`Error refreshing availability for courier ${courierId}:`, error);
                return false;
            }
        },

        async getDeliveriesForCourier(courierId: string): Promise<DeliveryRow[]> {
            return await deliveryRepository.getDeliveriesForCourier(courierId);
        },

        async getAvailableDeliveries(): Promise<DeliveryWithOrderDetails[]> {
            return await deliveryRepository.getActiveDeliveries();
        },

        async updateCourierLocation(location: InsertableCourierLocationRow): Promise<CourierLocation> {
            const result = await deliveryRepository.updateCourierLocation(location);
            
            // Broadcast location update to relevant parties
            await broadcastToDeliveryCouriers('courier_location_update', {
                courierId: result.courier_id,
                latitude: result.latitude,
                longitude: result.longitude,
                timestamp: result.timestamp
            });
            
            return {
                courier_id: result.courier_id,
                latitude: result.latitude,
                longitude: result.longitude,
                timestamp: result.timestamp
            };
        },

        async getCourierLocation(courierId: string): Promise<CourierLocation | null> {
            const location = await deliveryRepository.getCourierLocation(courierId);
            if (!location) return null;
            
            return {
                courier_id: location.courier_id,
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: location.timestamp
            };
        },

        async setCourierAvailability(
            courierId: string, 
            isAvailable: boolean,
            isWorking?: boolean
        ): Promise<CourierAvailabilityRow> {
            const currentStatus = await deliveryRepository.getCourierAvailability(courierId);
            
            // If isWorking isn't provided, maintain current value if it exists, otherwise set to true
            const finalIsWorking = isWorking !== undefined ? isWorking : (currentStatus?.is_working ?? true);
            
            console.log(`Setting courier ${courierId} availability:`, {
                isAvailable,
                isWorking: finalIsWorking,
                previousAvailable: currentStatus?.is_available,
                previousWorking: currentStatus?.is_working
            });
            
            const updateData: InsertableCourierAvailabilityRow = {
                courier_id: courierId,
                is_available: isAvailable,
                is_working: finalIsWorking
            };
            
            const updatedAvailability = await deliveryRepository.updateCourierAvailability(updateData);
            
            // If courier becomes available, check if there are any orders to assign
            if (isAvailable && finalIsWorking) {
                console.log(`Courier ${courierId} became available - checking for pending orders`);
                // Use a background task to avoid blocking the response
                Promise.resolve().then(async () => {
                    try {
                        // Verify courier is actually available for deliveries
                        const isReallyAvailable = await this.isAvailableForDelivery(courierId);
                        
                        if (isReallyAvailable) {
                            console.log(`Confirmed courier ${courierId} is available for deliveries, assigning pending order`);
                            await this.checkAndAssignDeliveriesToCourier(courierId);
                        } else {
                            console.log(`Although marked available, courier ${courierId} is not eligible for new deliveries`);
                        }
                    } catch (err) {
                        console.error('Error assigning deliveries to newly available courier:', err);
                    }
                });
            }
            
            return updatedAvailability;
        },
        
        async findAndAssignPendingDeliveries(): Promise<DeliveryRow[]> {
            if (!ordersRepository) {
                console.log('OrdersRepository not provided, cannot find pending deliveries');
                return [];
            }
            
            try {
                // Find orders that are ready for delivery but don't have a delivery record
                const pendingOrders = await ordersRepository.findOrdersReadyForDelivery();
                console.log(`Found ${pendingOrders.length} orders ready for delivery assignment`);
                
                if (pendingOrders.length === 0) return [];
                
                // Assign deliveries for each order
                const results = await Promise.allSettled(
                    pendingOrders.map(order => this.autoAssignDelivery(order.id))
                );
                
                // Filter successful assignments
                const successfulDeliveries = results
                    .filter((result): result is PromiseFulfilledResult<DeliveryRow> => 
                        result.status === 'fulfilled' && result.value !== null
                    )
                    .map(result => result.value);
                
                console.log(`Successfully assigned ${successfulDeliveries.length} deliveries out of ${pendingOrders.length} pending orders`);
                return successfulDeliveries;
            } catch (error) {
                console.error('Error finding and assigning pending deliveries:', error);
                return [];
            }
        },
        
        async checkAndAssignDeliveriesToCourier(courierId: string): Promise<DeliveryRow | null> {
            try {
                // Check if courier is available
                const isAvailable = await this.isAvailableForDelivery(courierId);
                if (!isAvailable) {
                    console.log(`Courier ${courierId} is not available for new deliveries`);
                    return null;
                }
                
                if (!ordersRepository) {
                    console.log('OrdersRepository not provided, cannot find pending deliveries');
                    return null;
                }
                
                // Find pending orders
                const pendingOrders = await ordersRepository.findOrdersReadyForDelivery();
                if (pendingOrders.length === 0) {
                    console.log('No pending orders found for delivery');
                    return null;
                }
                
                // Assign to the first pending order
                console.log(`Assigning order ${pendingOrders[0].id} to courier ${courierId}`);
                
                // Manually create a delivery record for this courier
                const delivery = await deliveryRepository.createDelivery({
                    order_id: pendingOrders[0].id,
                    courier_id: courierId,
                    status: 'assigned',
                    estimated_delivery_time: new Date(Date.now() + 30 * 60 * 1000),
                });
                
                // Automatically accept it
                const acceptedDelivery = await this.acceptDelivery(delivery.id, courierId);
                
                // Update order status
                await orderService.updateOrder(pendingOrders[0].id, { status: 'out_for_delivery' });
                
                // Notify about this assignment
                await broadcastToDeliveryCouriers('delivery_assigned_auto', {
                    deliveryId: acceptedDelivery.id,
                    orderId: acceptedDelivery.order_id,
                    status: acceptedDelivery.status,
                    courier_id: courierId,
                    message: 'Delivery automatically assigned and accepted'
                });
                
                console.log(`Successfully assigned order ${pendingOrders[0].id} to courier ${courierId}`);
                return acceptedDelivery;
            } catch (error) {
                console.error(`Error assigning delivery to courier ${courierId}:`, error);
                return null;
            }
        },

        async getDeliveryLocations(deliveryId: number): Promise<{
            pickup: { latitude: number, longitude: number } | null,
            dropoff: { latitude: number, longitude: number } | null
        }> {
            const delivery = await deliveryRepository.getDeliveryById(deliveryId);
            
            const [pickup, dropoff] = await Promise.all([
                deliveryRepository.getOrderDeliveryLocation(delivery.order_id),
                deliveryRepository.getCustomerDeliveryLocation(delivery.order_id)
            ]);
            
            return { pickup, dropoff };
        },

        async findNearestCourier(restaurantLatitude: number, restaurantLongitude: number): Promise<string | null> {
            // Get all available couriers with their locations
            const couriersWithLocations = await deliveryRepository.getAvailableCouriersWithLocations();
            
            if (couriersWithLocations.length === 0) {
                return null;
            }
            
            // Calculate distances for each courier
            const couriersWithDistances = couriersWithLocations.map(courier => {
                const distance = calculateDistance(
                    restaurantLatitude,
                    restaurantLongitude,
                    courier.latitude,
                    courier.longitude
                );
                
                return {
                    ...courier,
                    distance
                };
            });
            
            // Sort by distance (closest first)
            couriersWithDistances.sort((a, b) => a.distance - b.distance);
            
            // Return the closest courier's ID
            return couriersWithDistances[0].courier_id;
        },
        
        async assignDeliveryAutomatically(orderId: number): Promise<DeliveryRow | null> {
            try {
                // Check if order exists and is in a state ready for delivery
                const order = await orderService.findOrderById(orderId);
                console.log(`Checking order #${orderId} for automatic delivery assignment: status=${order?.status}, type=${order?.delivery_type}`);
                
                if (!order || order.status !== 'ready') {
                    console.log(`Order #${orderId} is not ready for delivery assignment (status: ${order?.status || 'not found'})`);
                    return null; // Order not ready for delivery yet
                }
                
                if (order.delivery_type !== 'delivery') {
                    console.log(`Order #${orderId} is not a delivery-type order (type: ${order.delivery_type})`);
                    return null; // Not a delivery order
                }
                
                // Check if this order already has a delivery assigned
                try {
                    const existingDeliveries = await deliveryRepository.findDeliveriesByOrderId(orderId);
                    if (existingDeliveries && existingDeliveries.length > 0) {
                        console.log(`Order #${orderId} already has ${existingDeliveries.length} delivery records assigned`);
                        return null; // Already has delivery record(s)
                    }
                } catch (err) {
                    // Just log and continue if this check fails
                    console.log(`Error checking for existing deliveries for order #${orderId}:`, err);
                }
                
                console.log(`Assigning courier to order #${orderId}`);
                
                // Assign the delivery to an available courier
                const delivery = await this.assignDelivery(orderId);
                
                console.log(`Created delivery #${delivery.id} for order #${orderId}, courier ${delivery.courier_id}`);
                
                // Auto-accept the delivery on behalf of the courier
                const now = new Date();
                const updatedDelivery = await deliveryRepository.updateDelivery(delivery.id, {
                    status: 'accepted',
                    assigned_at: now,
                    accepted_at: now
                });
                
                // Update the order status to indicate it's being delivered
                await orderService.updateOrder(orderId, { status: 'out_for_delivery' });
                
                console.log(`Order #${orderId} automatically assigned and accepted by courier ${delivery.courier_id}`);
                
                // Notify about auto-assignment and acceptance
                await broadcastToDeliveryCouriers('delivery_assigned_auto', {
                    deliveryId: updatedDelivery.id,
                    id: updatedDelivery.id, // Add this for backward compatibility
                    order_id: updatedDelivery.order_id,
                    orderId: updatedDelivery.order_id, // Add this for backward compatibility
                    status: updatedDelivery.status,
                    courier_id: updatedDelivery.courier_id,
                    message: 'Delivery automatically assigned and accepted'
                });
                
                return updatedDelivery;
            } catch (error) {
                console.error(`Failed to automatically assign delivery for order #${orderId}:`, error);
                return null;
            }
        },

        async autoAssignDelivery(orderId: number): Promise<DeliveryRow | null> {
            try {
                // Check if order exists and is in a state ready for delivery
                const order = await orderService.findOrderById(orderId);
                if (!order || order.status !== 'ready') { // Changed from 'ready_for_pickup' to 'ready'
                    return null; // Order not ready for delivery yet
                }
                
                // Use the enhanced assignDelivery method to find the nearest courier
                const delivery = await this.assignDelivery(orderId);
                
                // Auto-accept the delivery on behalf of the courier
                const acceptedDelivery = await this.acceptDelivery(delivery.id, delivery.courier_id);
                
                // Update the order status to indicate it's being delivered
                await orderService.updateOrder(orderId, { status: 'out_for_delivery' });
                
                console.log(`Order #${orderId} automatically assigned and accepted by courier ${delivery.courier_id}`);
                return acceptedDelivery;
            } catch (error) {
                console.error(`Failed to automatically assign delivery for order #${orderId}:`, error);
                return null;
            }
        },

        async isAvailableForDelivery(courierId: string): Promise<boolean> {
            // Check if courier is available and not handling any deliveries
            const [availability, activeDeliveryCount] = await Promise.all([
                deliveryRepository.getCourierAvailability(courierId),
                deliveryRepository.getCourierActiveDeliveryCount(courierId)
            ]);
            
            // Log detailed availability status for debugging
            console.log(`Courier ${courierId} availability check:`, {
                hasAvailabilityRecord: !!availability,
                isAvailable: availability?.is_available,
                isWorking: availability?.is_working,
                activeDeliveries: activeDeliveryCount
            });
            
            // If no availability record exists, courier cannot be available
            if (!availability) {
                console.log(`Courier ${courierId} has no availability record`);
                return false;
            }
            
            // Check if courier is marked as available and working
            const isAvailable = availability.is_available === true;
            const isWorking = availability.is_working === true;
            
            // Check if courier has no active deliveries
            const hasNoActiveDeliveries = activeDeliveryCount === 0;
            
            // Log the result of each condition
            if (!isAvailable) console.log(`Courier ${courierId} is not marked as available`);
            if (!isWorking) console.log(`Courier ${courierId} is not marked as working`);
            if (!hasNoActiveDeliveries) console.log(`Courier ${courierId} already has ${activeDeliveryCount} active deliveries`);
            
            return isAvailable && isWorking && hasNoActiveDeliveries;
        },

        // Add findDeliveriesByOrderId to DeliveryRepository interface
        async findDeliveriesByOrderId(orderId: number): Promise<DeliveryRow[]> {
            return await deliveryRepository.findDeliveriesByOrderId(orderId);
        }
    };
};
