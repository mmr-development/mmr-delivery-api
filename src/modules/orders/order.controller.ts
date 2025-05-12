import { FastifyPluginAsync } from 'fastify';
import { createOrderSchema, deleteOrderSchema, getOrderSchema, listOrdersSchema, updateOrderSchema } from './order.schema';
// import { 
//   createOrderSchema,
//   getOrderSchema, 
//   listOrdersSchema, 
//   updateOrderSchema, 
//   deleteOrderSchema
// } from './order.schema';
// import { OrderService } from './order.service';

export interface OrderControllerOptions {
    //   orderService: OrderService
}

export const orderController: FastifyPluginAsync<OrderControllerOptions> = async function (server, { }) {
    server.post('/orders/', { schema: { ...createOrderSchema } }, async (request, reply) => {

    });

    server.get('/orders/', { schema: { ...listOrdersSchema } }, async (request, reply) => {

    });

    server.get('/orders/:id', { schema: { ...getOrderSchema } }, async (request, reply) => {

    });

    server.put('/orders/:id', { schema: { ...updateOrderSchema } }, async (request, reply) => {

    });

    server.delete('/orders/:id', { schema: { ...deleteOrderSchema } }, async (request, reply) => {

    });
};
