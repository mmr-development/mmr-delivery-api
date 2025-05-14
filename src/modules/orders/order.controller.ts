import { FastifyPluginAsync } from 'fastify';
import { createOrderSchema, deleteOrderSchema, getOrderSchema, listOrdersSchema, updateOrderSchema } from './order.schema';
import { CreateOrderRequest } from './order';
import { OrderService } from './order.service';
import { UserService } from '../users';
import { CustomerService } from '../customer/customer.service';
import { AddressService } from '../address';
import { CatalogService } from '../partner/catalog';
import { PaymentService } from '../../payment/payment.service';
// import { 
//   createOrderSchema,
//   getOrderSchema, 
//   listOrdersSchema, 
//   updateOrderSchema, 
//   deleteOrderSchema
// } from './order.schema';
// import { OrderService } from './order.service';

export interface OrderControllerOptions {
    userService: UserService;
    addressService: AddressService;
    customerService: CustomerService;
    orderService: OrderService
    catalogService: CatalogService;
    paymentService: PaymentService;
}

export const orderController: FastifyPluginAsync<OrderControllerOptions> = async function (server, { userService, addressService, customerService, orderService, catalogService, paymentService }) {
    server.post<{ Body: CreateOrderRequest }>('/orders/', { schema: { tags: ['Orders'] } }, async (request, reply) => {
        const body = request.body as CreateOrderRequest;

        const addressId = await addressService.createAddress({
            country: body.customer.address.country,
            city: body.customer.address.city,
            street: body.customer.address.street,
            postalCode: body.customer.address.postal_code,
            addressDetail: body.customer.address.address_detail,
            latitude: body.customer.address.latitude,
            longitude: body.customer.address.longitude,
        });

        const user = await userService.createCustomerUser(body.customer);

        const customer = await customerService.createOrFindCustomer({
            user_id: user.id,
            address_id: addressId,
        });

        const orderItems = await Promise.all(body.order.items.map(async (item) => {
            const price = await catalogService.findCatalogItemPrice(item.catalog_item_id);

            if (price === null) {
                throw new Error(`Item with id ${item.catalog_item_id} not found`);
            }

            return {
                catalog_item_id: item.catalog_item_id,
                quantity: item.quantity,
                price: price,
                note: item.note
            };
        }));

        const total_amount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const orderData = {
            partner_id: body.order.partner_id,
            customer_id: customer.id,
            order_status: 'pending',
            delivery_type: body.order.delivery_type,
            total_amount,
            requested_delivery_time: body.order.requested_delivery_time,
            tip_amount: body.order.tip_amount || 0,
            customer_note: body.order.customer_note,
        }

        const createdOrder = await orderService.createOrder(orderData);

        const createdOrderItems = await orderService.createOrderItems(createdOrder.id, orderItems);

        const payment = await paymentService.createPayment({
            order_id: createdOrder.id,
            payment_status: 'pending',
            payment_method: body.order.payment_method, // must be provided in request
            transaction_id: null,
            transaction_data: {},
        });

        return reply.code(201).send({
            order: createdOrder,
            items: createdOrderItems,
            payment,
        });
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
