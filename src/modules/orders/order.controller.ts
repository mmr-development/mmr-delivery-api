import { FastifyPluginAsync } from 'fastify';
import { CreateOrderRequest, createOrderSchema, GetOrdersQuery, getOrdersSchema, updateOrderSchema } from './order.schema';
import { OrderService } from './order.service';
import util from 'node:util';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export interface OrderControllerOptions {
    orderService: OrderService
}

const EMPTY_ORDERS_RESPONSE = {
    orders: [],
    pagination: { total: 0, offset: 0, limit: 0 }
};

export const orderController: FastifyPluginAsync<OrderControllerOptions> = async function (server, { orderService }) {

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
            return reply.code(200).send(updatedOrder);
        } catch (error) {
            throw error;
        }
    });

    // server.delete('/orders/:id', { schema: { ...deleteOrderSchema } }, async (request, reply) => {

    // });
};
