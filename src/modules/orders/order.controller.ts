import { FastifyPluginAsync } from 'fastify';
import { CreateOrderRequest, createOrderSchema, GetOrdersQuery, getOrdersSchema } from './order.schema';
import { OrderService } from './order.service';

export interface OrderControllerOptions {
    orderService: OrderService
}

export const orderController: FastifyPluginAsync<OrderControllerOptions> = async function (server, { orderService }) {
    server.post<{ Body: CreateOrderRequest }>('/orders/', { schema: { ...createOrderSchema } }, async (request, reply) => {
        const orderData = request.body;
        try {
            server.log.info(`Order API was called to add a new order: ${JSON.stringify(orderData)}`);
            const createOrder = await orderService.createOrder(orderData);
            return reply.code(201).send(createOrder);
        } catch (error) {
            throw error;
        }
    });

    server.get<{ Querystring: GetOrdersQuery }>('/orders/', { schema: { ...getOrdersSchema } }, async (request, reply) => {
        const query = request.query;
        try {
            const orders = await orderService.findOrders(query);
            server.log.info(`Order API was called to get all orders: ${JSON.stringify(orders)}`);
            return reply.code(200).send(orders)
        } catch (error) {

        }
    });

    // server.get('/orders/:id', { schema: { ...getOrderSchema } }, async (request, reply) => {

    // });

    // server.put('/orders/:id', { schema: { ...updateOrderSchema } }, async (request, reply) => {

    // });

    // server.delete('/orders/:id', { schema: { ...deleteOrderSchema } }, async (request, reply) => {

    // });
};
