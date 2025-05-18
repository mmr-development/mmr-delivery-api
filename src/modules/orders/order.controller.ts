import { FastifyPluginAsync } from 'fastify';
import { CreateOrderRequest, createOrderSchema, GetOrdersQuery, getOrdersSchema, updateOrderSchema } from './order.schema';
import { OrderService } from './order.service';
import util from 'node:util';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { DeliveryService } from '../delivery/delivery.service'; // Import DeliveryService

export interface OrderControllerOptions {
    orderService: OrderService;
    deliveryService?: DeliveryService; // Optional delivery service
}

const EMPTY_ORDERS_RESPONSE = {
    orders: [],
    pagination: { total: 0, offset: 0, limit: 0 }
};

export const orderController: FastifyPluginAsync<OrderControllerOptions> = async function (server, { orderService, deliveryService }) {

    const typedServer = server.withTypeProvider<TypeBoxTypeProvider>();

    typedServer.post('/orders/', { schema: createOrderSchema }, async (request, reply) => {
        const orderData = request.body;
        try {
            server.log.info(`Order API was called to add a new order: ${util.inspect(request.body)}`);
            const createOrder = await orderService.createOrder(orderData);
            return reply.code(201).send(createOrder);
        } catch (error) {
            throw error;
        }
    });

    typedServer.get('/orders/', { schema: getOrdersSchema, preHandler: [server.authenticate] }, async (request, reply) => {
        const query = request.query;
        try {
            const orders = await orderService.findOrders(query);
            server.log.info(`Order API was called to get all orders: ${util.inspect(orders)}`);
            return reply.code(200).send(orders)
        } catch (error) {
            return reply.code(500).send(EMPTY_ORDERS_RESPONSE);
        }
    });

    // server.get('/orders/:id', { schema: { ...getOrderSchema } }, async (request, reply) => {

    // });

    typedServer.patch('/orders/:id', { schema: updateOrderSchema }, async (request, reply) => {
        const orderId = request.params.id;
        const orderData = request.body;
        try {
            server.log.info(`Order API was called to update order: ${util.inspect(orderData)}`);
            const updatedOrder = await orderService.updateOrder(orderId, orderData);
            
            // If order status was updated to 'ready' or 'confirmed' and delivery service is available,
            // attempt to assign delivery immediately
            if (deliveryService && 
                orderData.status && 
                ['ready', 'confirmed'].includes(orderData.status) && 
                updatedOrder.delivery_type === 'delivery') {
                
                server.log.info(`Order #${orderId} status changed to ${orderData.status} - attempting immediate delivery assignment`);
                
                try {
                    // Check if delivery already exists
                    const existingDelivery = await deliveryService.getDeliveryByOrderId(orderId);
                    
                    if (!existingDelivery) {
                        // Attempt to force assign a courier
                        const delivery = await deliveryService.forceAssignDelivery(orderId);
                        if (delivery) {
                            server.log.info(`Successfully assigned order #${orderId} to courier ${delivery.courier_id}`);
                        } else {
                            server.log.info(`No available couriers for order #${orderId}, will be picked up by background task`);
                        }
                    }
                } catch (error) {
                    server.log.error(`Error during immediate delivery assignment: ${error.message}`);
                }
            }
            
            return reply.code(200).send(updatedOrder);
        } catch (error) {
            throw error;
        }
    });

    // Update the order confirmation endpoint for instant delivery assignment
    typedServer.post('/orders/:id/confirm', {
        schema: {
            params: Type.Object({
                id: Type.Number()
            }),
            response: {
                200: Type.Object({
                    message: Type.String(),
                    order_id: Type.Number(),
                    delivery_id: Type.Optional(Type.Number()),
                    status: Type.String(),
                    instant_delivery: Type.Optional(Type.Boolean())
                })
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const orderId = request.params.id;
        
        try {
            server.log.info(`Confirming order #${orderId} with instant delivery assignment if possible`);
            
            // First update order status to "confirmed"
            const updatedOrder = await orderService.updateOrder(orderId, { status: 'confirmed' });
            
            // For delivery-type orders, try to immediately assign delivery
            if (deliveryService && updatedOrder.delivery_type === 'delivery') {
                server.log.info(`Order #${orderId} is of type delivery - attempting courier assignment`);
                
                try {
                    // Check if delivery already exists
                    const existingDelivery = await deliveryService.getDeliveryByOrderId(orderId);
                    
                    if (existingDelivery) {
                        server.log.info(`Order #${orderId} already has delivery #${existingDelivery.id} assigned to courier ${existingDelivery.courier_id}`);
                        return reply.code(200).send({
                            message: 'Order confirmed. Delivery was already assigned.',
                            order_id: orderId,
                            delivery_id: existingDelivery.id,
                            status: existingDelivery.status,
                            instant_delivery: false
                        });
                    }
                    
                    // Get available couriers before assignment
                    const availableCouriers = await deliveryService.getAvailableCouriers();
                    server.log.info(`Found ${availableCouriers.length} available couriers before attempting assignment`);
                    
                    // Direct delivery assignment attempt - FORCE assignment to most available courier
                    const delivery = await deliveryService.forceAssignDelivery(orderId);
                    
                    if (delivery) {
                        server.log.info(`Successfully assigned order #${orderId} to courier ${delivery.courier_id}`);
                        return reply.code(200).send({
                            message: 'Order confirmed and delivery assigned to courier',
                            order_id: orderId,
                            delivery_id: delivery.id,
                            status: delivery.status,
                            courier_id: delivery.courier_id,
                            instant_delivery: true
                        });
                    } else {
                        server.log.warn(`Failed to assign delivery for order #${orderId} despite forcing assignment`);
                    }
                } catch (error) {
                    server.log.error(`Error in delivery assignment for order #${orderId}: ${error.message}`);
                }
            } else {
                server.log.info(`Order #${orderId} is not eligible for delivery assignment (type: ${updatedOrder.delivery_type})`);
            }
            
            // Default response when instant assignment is not possible or not needed
            return reply.code(200).send({
                message: updatedOrder.delivery_type === 'delivery' 
                    ? 'Order confirmed, delivery will be assigned when courier becomes available'
                    : 'Order confirmed successfully',
                order_id: orderId,
                status: updatedOrder.status,
                instant_delivery: false
            });
        } catch (error) {
            server.log.error(`Error confirming order ${orderId}: ${error.message}`);
            return reply.code(500).send({
                message: `Failed to confirm order: ${error.message}`,
                order_id: orderId,
                status: 'error'
            });
        }
    });

    // server.delete('/orders/:id', { schema: { ...deleteOrderSchema } }, async (request, reply) => {

    // });
};
