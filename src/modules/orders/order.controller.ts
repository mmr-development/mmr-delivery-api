import { FastifyPluginAsync } from 'fastify';
import { CreateOrderRequest, createOrderSchema, GetOrdersQuery, getOrdersSchema, updateOrderSchema } from './order.schema';
import { OrderService } from './order.service';
import util from 'node:util';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DeliveryService } from '../delivery/delivery.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { CustomerService } from '../customer/customer.service';
import { DeliveryTokenService } from '../delivery/delivery-token.service';
import { EmailService } from '../email';

export interface OrderControllerOptions {
    orderService: OrderService;
    deliveryService?: DeliveryService;
    customerService: CustomerService;
    pushNotificationService: PushNotificationService;
    deliveryTokenService: DeliveryTokenService
    emailService: EmailService;
}

const EMPTY_ORDERS_RESPONSE = {
    orders: [],
    pagination: { total: 0, offset: 0, limit: 0 }
};

export const orderController: FastifyPluginAsync<OrderControllerOptions> = async function (server, { orderService, deliveryService, customerService, pushNotificationService, deliveryTokenService, emailService }) {

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
        const userId = request.user.sub;
        const userRole = request.user.roles[0];
        const query = request.query;
        try {

            if (userRole === 'customer') {
                query.user_id = userId;
            }

            const orders = await orderService.findOrders(query);
            server.log.info(`Order API was called to get all orders: ${util.inspect(orders)}`);
            return reply.code(200).send(orders)
        } catch (error) {
            return reply.code(500).send(EMPTY_ORDERS_RESPONSE);
        }
    });

    typedServer.patch('/orders/:id/', { schema: updateOrderSchema }, async (request, reply) => {
        const orderId = request.params.id;
        const orderData = request.body;
        let trackingToken = null;
        try {
            server.log.info(`Order API was called to update order: ${util.inspect(orderData)}`);
            const updatedOrder = await orderService.updateOrder(orderId, orderData);

            if (deliveryService &&
                orderData.status &&
                ['preparing'].includes(orderData.status) &&
                updatedOrder.delivery_type === 'delivery') {

                server.log.info(`Order #${orderId} status changed to ${orderData.status} - attempting immediate delivery assignment`);

                try {
                    const existingDelivery = await deliveryService.getDeliveryByOrderId(orderId);
                    if (existingDelivery) {
                        trackingToken = deliveryTokenService.generateToken(existingDelivery.id, orderId);
                        console.log(`Tracking token for order #${orderId}, delivery #${existingDelivery.id}: ${trackingToken}`);
                    } else {
                        const delivery = await deliveryService.forceAssignDelivery(orderId);
                        if (delivery) {
                            server.log.info(`Successfully assigned order #${orderId} to courier ${delivery.courier_id}`);
                            trackingToken = deliveryTokenService.generateToken(delivery.id, orderId);
                            console.log(`Tracking token for order #${orderId}, delivery #${delivery.id}: ${trackingToken}`);
                            await orderService.notifyCustomerOfDeliveryAssignment(orderId, delivery.id);
                        } else {
                            server.log.info(`No available couriers for order #${orderId}, will be picked up by background task`);
                        }
                    }
                } catch (error) {
                    server.log.error(`Error during immediate delivery assignment: ${error.message}`);
                }
            }

            if (orderData.status === 'confirmed') {
                const order = await orderService.getOrderAndCustomerDetails(orderId);
                if (order && order.email) {
                    const templateData = {
                        customerName: `${order.first_name} ${order.last_name}`,
                        customerEmail: order.email,
                        customerPhone: order.phone_number,
                        orderId: order.order_id,
                        orderDate: new Date(order.created_at).toLocaleString('da-DK'),
                        partnerName: order.partner_name || '',
                        partnerPhone: order.partner_phone_number || '',
                        partnerAddress: `${order.street} ${order.address_detail}, ${order.postal_code} ${order.city}`,
                        isDelivery: order.delivery_type === 'delivery',
                        paymentMethod: order.payment_method,
                        note: order.note,
                        items: order.items?.map(item => ({
                            itemName: item.item_name,
                            quantity: item.quantity,
                            price: item.price,
                            note: item.note
                        })) || [],
                        subtotal: order.items?.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0) || 0,
                        deliveryFee: order.delivery_fee || null,
                        tip: order.tip_amount,
                        total: order.total_amount,
                        deliveryAddress: order.delivery_type === 'delivery'
                            ? `${order.street} ${order.address_detail}, ${order.postal_code} ${order.city}`
                            : undefined,
                        estimatedTime: order.requested_delivery_time
                            ? new Date(order.requested_delivery_time).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
                            : undefined,
                        appName: 'MMR Delivery',
                        supportEmail: process.env.SUPPORT_EMAIL || 'support@mmr.com',
                        currentYear: new Date().getFullYear(),
                        country: order.country,
                        city: order.city,
                        postalCode: order.postal_code,
                        street: order.street,
                        addressDetail: order.address_detail
                    };

                    await emailService.sendOrderConfirmationEmail(order.email, order.order_id, templateData);
                }
            }

            return reply.code(200).send({
                message: `Order #${orderId} updated successfully`,
                order: updatedOrder,
            });
        } catch (error) {
            throw error;
        }
    });
    typedServer.get('/orders/statistics', {
        schema: {
            tags: ['Orders'],
            querystring: {
                type: 'object',
                properties: {
                    partnerId: { type: 'integer', minimum: 1, nullable: true },
                    startDate: { type: 'string', format: 'date-time', nullable: true },
                    endDate: { type: 'string', format: 'date-time', nullable: true }
                },
                additionalProperties: false
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { partnerId, startDate, endDate } = request.query as any;
        try {
            const stats = await orderService.getOrderStatistics(partnerId, {startDate, endDate});
            return reply.code(200).send(stats);
        } catch (error) {
            server.log.error(`Error fetching order statistics: ${error.message}`);
            return reply.code(500).send({ error: 'Failed to fetch order statistics' });
        }
    });
};
