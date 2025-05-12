import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// Common response properties
const DeliveryMethodProperties = {
  id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  // created_at: Type.String({ format: 'date-time' }),
  // updated_at: Type.String({ format: 'date-time' })
};

// Response schemas
const DeliveryMethodResponseSchema = Type.Object(DeliveryMethodProperties);

// Enforce object with delivery_methods array
const DeliveryMethodObjectArrayResponseSchema = Type.Object({
  delivery_methods: Type.Array(DeliveryMethodResponseSchema)
});

const ErrorSchema = Type.Object({
  message: Type.String(),
  statusCode: Type.Number()
});

// TypeScript types
export type DeliveryMethodResponse = Static<typeof DeliveryMethodResponseSchema>;
export type DeliveryMethodObjectArrayResponse = Static<typeof DeliveryMethodObjectArrayResponseSchema>;

export const createDeliveryMethodSchema: FastifySchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 })
  }, { additionalProperties: false }),
  response: {
    201: DeliveryMethodResponseSchema
  },
  tags: ['Delivery Methods'],
  description: 'Create a new delivery method',
  summary: 'Create delivery method',
  security: [{ bearerAuth: [] }]
};

export const getDeliveryMethodsSchema: FastifySchema = {
  response: {
    200: DeliveryMethodObjectArrayResponseSchema
  },
  tags: ['Delivery Methods'],
  description: 'Get all delivery methods',
  summary: 'List delivery methods'
  // No security property - publicly accessible
};

export const getDeliveryMethodByIdSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  response: {
    200: DeliveryMethodResponseSchema,
    404: ErrorSchema
  },
  tags: ['Delivery Methods'],
  description: 'Get delivery method details by ID',
  summary: 'Get delivery method',
  // No security property - publicly accessible
};

export const updateDeliveryMethodSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 })
  }, { additionalProperties: false }),
  response: {
    200: DeliveryMethodResponseSchema,
    404: ErrorSchema
  },
  tags: ['Delivery Methods'],
  description: 'Update an existing delivery method',
  summary: 'Update delivery method',
  security: [{ bearerAuth: [] }]
};

export const deleteDeliveryMethodSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  response: {
    204: Type.Null(),
    404: ErrorSchema
  },
  tags: ['Delivery Methods'],
  description: 'Delete a delivery method by ID',
  summary: 'Delete delivery method',
  security: [{ bearerAuth: [] }]
};