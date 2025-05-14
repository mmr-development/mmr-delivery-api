import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

export const PaymentMethodEnum = Type.Union([
  Type.Literal('credit_card'),
  Type.Literal('debit_card'),
  Type.Literal('paypal'),
  Type.Literal('mobile_pay'),
]);

export const OrderStatusEnum = Type.Union([
  Type.Literal('pending'),
  Type.Literal('confirmed'),
  Type.Literal('preparing'),
  Type.Literal('ready'),
  Type.Literal('dispatched'),
  Type.Literal('delivered'),
  Type.Literal('cancelled'),
  Type.Literal('failed'),
  Type.Literal('refunded')
]);

export const DeliveryTypeEnum = Type.Union([
  Type.Literal('pickup'),
  Type.Literal('delivery'),
]);

export const CustomerSchema = Type.Object({
  first_name: Type.String(),
  last_name: Type.String(),
  email: Type.String(),
  phone_number: Type.String(),
  address: Type.Object({
    country: Type.String(),
    city: Type.String(),
    street: Type.String(),
    postal_code: Type.String(),
    address_detail: Type.Optional(Type.String()),
    latitude: Type.Optional(Type.Number()),
    longitude: Type.Optional(Type.Number()),
  }),
});

export const BaseOrderItemSchema = Type.Object({
  catalog_item_id: Type.Number(),
  quantity: Type.Number({ minimum: 1 }),
  note: Type.Optional(Type.String()),
});

export const CreateOrderItemSchema = BaseOrderItemSchema;

export const GetOrderItemSchema = Type.Intersect([
  BaseOrderItemSchema,
  Type.Object({
    price: Type.Number(),
    name: Type.Optional(Type.String()),
  })
]);

export const OrderSchema = Type.Object({
  partner_id: Type.Number(),
  delivery_type: DeliveryTypeEnum,
  requested_delivery_time: Type.Unsafe<Date>({ format: 'date-time' }),
  tip_amount: Type.Number(),
  note: Type.Optional(Type.String()),
  items: Type.Array(CreateOrderItemSchema),
});

export const CreateOrderSchema = Type.Object({
  customer: CustomerSchema,
  order: OrderSchema,
  payment: Type.Object({
    method: PaymentMethodEnum
  }),
})

export const CreateOrderResponseSchema = Type.Object({
  message: Type.String(),
});

export type CreateOrderResponse = Static<typeof CreateOrderResponseSchema>;
export type CreateOrderRequest = Static<typeof CreateOrderSchema>;

export const createOrderSchema: FastifySchema = {
  body: CreateOrderSchema,
  response: {
    201: CreateOrderResponseSchema,
  },
  tags: ['Orders'],
  description: 'Create a new order',
  summary: 'Create order',
};

export const GetOrderResponseSchema = Type.Object({
  id: Type.Number(),
  partner_id: Type.Number(),
  customer: CustomerSchema,
  delivery_type: DeliveryTypeEnum,
  status: OrderStatusEnum,
  requested_delivery_time: Type.Unsafe<Date>({ format: 'date-time' }),
  tip_amount: Type.Number(),
  note: Type.Optional(Type.String()),
  items: Type.Array(GetOrderItemSchema),
  // payment: Type.Object({
  //   method: PaymentMethodEnum,
  // }),
  created_at: Type.Unsafe<Date>({ format: 'date-time' }),
  updated_at: Type.Unsafe<Date>({ format: 'date-time' })
});

export const getOrdersQuerySchema = Type.Object({
  partner_id: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number({ default: 0, minimum: 0 })),
  limit: Type.Optional(Type.Number({ default: 10, minimum: 1, maximum: 100 }))
});

export const getOrdersResponseSchema = Type.Object({
  orders: Type.Array(GetOrderResponseSchema),
  // pagination: Type.Object({
  //   total: Type.Number(),
  //   offset: Type.Number(),
  //   limit: Type.Number(),
  // })
});

export const getOrdersSchema: FastifySchema = {
  querystring: getOrdersQuerySchema,
  response: {
    200: getOrdersResponseSchema
  },
  tags: ['Orders'],
  description: 'Get orders for a partner',
  summary: 'Get orders',
  security: [{ bearerAuth: [] }],
};

export type GetOrdersResponse = Static<typeof getOrdersResponseSchema>;
export type GetOrdersQuery = Static<typeof getOrdersQuerySchema>;

