import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// Simple order item schema
const OrderItemSchema = Type.Object({
  product_id: Type.String({ description: 'ID of the catalog item' }),
  name: Type.String({ description: 'Product name' }),
  quantity: Type.Number({ minimum: 1, description: 'Quantity ordered' }),
  unit_price: Type.Number({ minimum: 0, description: 'Price per unit' })
}, { description: 'Order item details' });

// Simple create order request
const CreateOrderRequestSchema = Type.Object({
  partner_id: Type.String({ description: 'ID of the partner' }),
  items: Type.Array(OrderItemSchema, { 
    minItems: 1, 
    description: 'Items in the order' 
  }),
  payment_method: Type.String({
    enum: ['cash', 'card', 'mobilpay'],
    description: 'Payment method to be used'
  }),
  delivery_time: Type.Union([
    Type.Literal('asap'),
    Type.String({ format: 'date-time' })
  ], { description: 'When the order should be delivered or picked up' }),
  customer_name: Type.String({ description: 'Customer full name' }),
  customer_phone: Type.String({ description: 'Customer contact number' }),
  // Simple address fields
  address_street: Type.Optional(Type.String({ description: 'Street address' })),
  address_city: Type.Optional(Type.String({ description: 'City' })),
  address_postal_code: Type.Optional(Type.String({ description: 'Postal code' }))
}, { description: 'Order creation request' });

// Simple order response
const OrderResponseSchema = Type.Object({
  id: Type.String({ description: 'Unique order identifier' }),
  partner_id: Type.String({ description: 'Partner ID' }),
  status: Type.String({ description: 'Current order status' }),
  items: Type.Array(OrderItemSchema, { description: 'Order items' }),
  payment_method: Type.String({ description: 'Payment method' }),
  delivery_time: Type.String({ description: 'Delivery or pickup time' }),
  customer_name: Type.String({ description: 'Customer name' }),
  customer_phone: Type.String({ description: 'Customer phone number' }),
  address_street: Type.Optional(Type.String({ description: 'Street address' })),
  address_city: Type.Optional(Type.String({ description: 'City' })),
  address_postal_code: Type.Optional(Type.String({ description: 'Postal code' })),
  created_at: Type.String({ format: 'date-time', description: 'Order creation timestamp' }),
  updated_at: Type.String({ format: 'date-time', description: 'Last update timestamp' })
}, { description: 'Order details response' });

// Simple update order request
const UpdateOrderRequestSchema = Type.Object({
  status: Type.Optional(Type.String({ description: 'New status for the order' }))
}, { description: 'Order update request' });

// Simple list orders response
const ListOrdersResponseSchema = Type.Object({
  orders: Type.Array(OrderResponseSchema, { description: 'List of orders' }),
  total: Type.Number({ description: 'Total number of orders matching criteria' }),
  page: Type.Number({ description: 'Current page number' }),
  limit: Type.Number({ description: 'Number of items per page' })
}, { description: 'Paginated list of orders' });

// Example data for Swagger docs
const orderExample = {
  id: '123',
  partner_id: '456',
  status: 'pending',
  items: [
    {
      product_id: '789',
      name: 'Burger',
      quantity: 2,
      unit_price: 9.99
    }
  ],
  payment_method: 'card',
  delivery_time: '2025-05-13T10:30:00Z',
  customer_name: 'John Doe',
  customer_phone: '+4512345678',
  address_street: 'Main Street 123',
  address_city: 'Copenhagen',
  address_postal_code: '1000',
  created_at: '2025-05-13T09:25:00Z',
  updated_at: '2025-05-13T09:25:00Z'
};

// FastifySchema objects for API routes with Swagger documentation
export const createOrderSchema: FastifySchema = {
  body: CreateOrderRequestSchema,
  response: {
    201: OrderResponseSchema
  },
  tags: ['Orders'],
  description: 'Creates a new order in the system',
  summary: 'Create new order',
  consumes: ['application/json'],
  produces: ['application/json'],
  security: [{ bearerAuth: [] }]
};

export const getOrderSchema: FastifySchema = {
  params: Type.Object({
    id: Type.String({ description: 'Order ID' })
  }),
  response: {
    200: OrderResponseSchema
  },
  tags: ['Orders'],
  description: 'Retrieves an order by its unique identifier',
  summary: 'Get order details',
  consumes: ['application/json'],
  produces: ['application/json'],
  security: [{ bearerAuth: [] }]
};

export const updateOrderSchema: FastifySchema = {
  params: Type.Object({
    id: Type.String({ description: 'Order ID to update' })
  }),
  body: UpdateOrderRequestSchema,
  response: {
    200: OrderResponseSchema
  },
  tags: ['Orders'],
  description: 'Updates an existing order - currently supports status updates',
  summary: 'Update order',
  consumes: ['application/json'],
  produces: ['application/json'],
  security: [{ bearerAuth: [] }]
};

export const deleteOrderSchema: FastifySchema = {
  params: Type.Object({
    id: Type.String({ description: 'Order ID to delete' })
  }),
  response: {
    204: Type.Null()
  },
  tags: ['Orders'],
  description: 'Deletes an order - requires admin privileges',
  summary: 'Delete order',
  security: [{ bearerAuth: [] }]
};

export const listOrdersSchema: FastifySchema = {
  querystring: Type.Object({
    partner_id: Type.Optional(Type.String({ description: 'Filter orders by partner ID' })),
    status: Type.Optional(Type.String({ description: 'Filter orders by status' })),
    page: Type.Optional(Type.Number({ 
      minimum: 1, 
      default: 1, 
      description: 'Page number for pagination' 
    })),
    limit: Type.Optional(Type.Number({ 
      minimum: 1, 
      maximum: 100, 
      default: 10, 
      description: 'Number of results per page' 
    }))
  }),
  response: {
    200: ListOrdersResponseSchema
  },
  tags: ['Orders'],
  description: 'Lists orders with optional filtering and pagination',
  summary: 'List orders',
  consumes: ['application/json'],
  produces: ['application/json'],
  security: [{ bearerAuth: [] }]
};

// TypeScript types
export type OrderItem = Static<typeof OrderItemSchema>;
export type CreateOrderRequest = Static<typeof CreateOrderRequestSchema>;
export type OrderResponse = Static<typeof OrderResponseSchema>;
export type UpdateOrderRequest = Static<typeof UpdateOrderRequestSchema>;
export type ListOrdersResponse = Static<typeof ListOrdersResponseSchema>;