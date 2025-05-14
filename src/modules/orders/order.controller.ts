import { FastifyPluginAsync } from 'fastify';
import { CreateOrderRequest, createOrderSchema } from './order.schema';
import { OrderService, PartnerNotFoundError } from './order.service';

export interface OrderControllerOptions {
    orderService: OrderService
}

export const orderController: FastifyPluginAsync<OrderControllerOptions> = async function (server, { orderService }) {
    server.post<{ Body: CreateOrderRequest }>('/orders/', { schema: { ...createOrderSchema, tags: ['Orders'] } }, async (request, reply) => {
        const orderData = request.body;
        try {
            const createOrder = await orderService.createOrder(orderData);
            return reply.code(201).send(createOrder);
        } catch (error) {
            throw error;
        }
    });

    server.get('/orders/', { schema: {} }, async (request, reply) => {
        const { offset, limit } = request.query as { offset?: number; limit?: number; };

        const result = await orderService.findOrders({ offset, limit });

        return reply.send({
            orders: result.orders,
            count: result.count,
        });
    });

    // server.get('/orders/:id', { schema: { ...getOrderSchema } }, async (request, reply) => {

    // });

    // server.put('/orders/:id', { schema: { ...updateOrderSchema } }, async (request, reply) => {

    // });

    // server.delete('/orders/:id', { schema: { ...deleteOrderSchema } }, async (request, reply) => {

    // });
};
