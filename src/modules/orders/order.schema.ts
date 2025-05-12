import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// Address schema
export const AddressSchema = Type.Object({
  street: Type.String({ minLength: 1 }),
  postal_code: Type.String({ minLength: 1 }),
  city: Type.String({ minLength: 1 }),
  floor: Type.Optional(Type.String()),
  apartment_name: Type.Optional(Type.String()),
  company_name: Type.Optional(Type.String())
});

// Customer schema
export const CustomerSchema = Type.Object({
  full_name: Type.String({ minLength: 1 }),
  phone_number: Type.String({ minLength: 5 }),
  contact_option: Type.Optional(Type.String())
});

// Delivery details schema
export const DeliveryDetailsSchema = Type.Object({
  delivery_time: Type.Union([
    Type.Literal('asap'),
    Type.String({ format: 'date-time' })
  ]),
  delivery_note: Type.Optional(Type.String()),
  delivery_tip: Type.Optional(Type.Number())
});

// Payment details schema
export const PaymentDetailsSchema = Type.Object({
  payment_method: Type.String({
    enum: ['creditcard', 'paypal', 'mobilpay']
  }),
  payment_status: Type.String({
    enum: ['pending', 'paid', 'failed']
  })
});

// Order item schema
export const OrderItemSchema = Type.Object({
  product_id: Type.String(),
  name: Type.String(),
  quantity: Type.Number({ minimum: 1 }),
  unit_price: Type.Number({ minimum: 0 }),
  total_price: Type.Number({ minimum: 0 }),
  notes: Type.Optional(Type.String())
});

// Create order request schema
export const CreateOrderRequestSchema = Type.Object({
  restaurant_id: Type.String(),
  address: AddressSchema,
  customer: CustomerSchema,
  delivery: DeliveryDetailsSchema,
  payment: PaymentDetailsSchema,
  items: Type.Array(OrderItemSchema),
  subtotal: Type.Number({ minimum: 0 }),
  delivery_fee: Type.Number({ minimum: 0 }),
  tax: Type.Number({ minimum: 0 }),
  total: Type.Number({ minimum: 0 })
});

// Order response schema
export const OrderResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  restaurant_id: Type.String(),
  address: AddressSchema,
  customer: CustomerSchema,
  delivery: DeliveryDetailsSchema,
  payment: PaymentDetailsSchema,
  items: Type.Array(OrderItemSchema),
  subtotal: Type.Number({ minimum: 0 }),
  delivery_fee: Type.Number({ minimum: 0 }),
  tax: Type.Number({ minimum: 0 }),
  total: Type.Number({ minimum: 0 }),
  status: Type.String({
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']
  }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// Update order request schema
export const UpdateOrderRequestSchema = Type.Object({
  status: Type.Optional(Type.String({
    enum: ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']
  })),
  delivery: Type.Optional(DeliveryDetailsSchema),
  payment: Type.Optional(PaymentDetailsSchema)
});

// List orders response schema
export const ListOrdersResponseSchema = Type.Object({
  orders: Type.Array(OrderResponseSchema),
  total: Type.Number(),
  page: Type.Number(),
  limit: Type.Number()
});

// FastifySchema objects for API routes

export const createOrderSchema: FastifySchema = {
  body: CreateOrderRequestSchema,
  response: {
    201: OrderResponseSchema
  },
  tags: ['Orders'],
  description: 'Create a new order',
  summary: 'Create order'
};

export const getOrderSchema: FastifySchema = {
  params: Type.Object({
    id: Type.String({ format: 'uuid' })
  }),
  response: {
    200: OrderResponseSchema
  },
  tags: ['Orders'],
  description: 'Get order by ID',
  summary: 'Get order'
};

export const updateOrderSchema: FastifySchema = {
  params: Type.Object({
    id: Type.String({ format: 'uuid' })
  }),
  body: UpdateOrderRequestSchema,
  response: {
    200: OrderResponseSchema
  },
  tags: ['Orders'],
  description: 'Update an existing order',
  summary: 'Update order'
};

export const deleteOrderSchema: FastifySchema = {
  params: Type.Object({
    id: Type.String({ format: 'uuid' })
  }),
  response: {
    204: Type.Null()
  },
  tags: ['Orders'],
  description: 'Delete an order',
  summary: 'Delete order'
};

export const listOrdersSchema: FastifySchema = {
  querystring: Type.Object({
    restaurant_id: Type.Optional(Type.String()),
    status: Type.Optional(Type.String({
      enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']
    })),
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 }))
  }),
  response: {
    200: ListOrdersResponseSchema
  },
  tags: ['Orders'],
  description: 'List all orders with filtering options',
  summary: 'List orders'
};

// TypeScript types
export type Address = Static<typeof AddressSchema>;
export type Customer = Static<typeof CustomerSchema>;
export type DeliveryDetails = Static<typeof DeliveryDetailsSchema>;
export type PaymentDetails = Static<typeof PaymentDetailsSchema>;
export type OrderItem = Static<typeof OrderItemSchema>;
export type CreateOrderRequest = Static<typeof CreateOrderRequestSchema>;
export type OrderResponse = Static<typeof OrderResponseSchema>;
export type UpdateOrderRequest = Static<typeof UpdateOrderRequestSchema>;
export type ListOrdersResponse = Static<typeof ListOrdersResponseSchema>;