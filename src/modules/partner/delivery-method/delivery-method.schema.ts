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

export const PaginationQuerySchema = Type.Object({
  offset: Type.Optional(Type.Number({
    description: 'Number of items to skip',
  })),
  limit: Type.Optional(Type.Number({
    description: 'Maximum number of items to return',
  }))
});

export const DeliveryMethodListSchema = Type.Object({
  delivery_methods: Type.Array(DeliveryMethodResponseSchema),
  pagination: Type.Optional(Type.Object({
    total: Type.Number({ description: 'Total number of partner applications available' }),
    offset: Type.Optional(Type.Number({ description: 'Current offset (number of applications skipped)' })),
    limit: Type.Optional(Type.Number({ description: 'Current limit (maximum number of applications returned)' }))
  }))
});

export const getDeliveryMethodsSchema: FastifySchema = {
  querystring: PaginationQuerySchema,
  response: {
    200: DeliveryMethodListSchema
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