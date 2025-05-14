import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// Common response properties
const BusinessTypeProperties = {
  id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  // created_at: Type.String({ format: 'date-time' }),
  // updated_at: Type.String({ format: 'date-time' })
};

// Response schemas
const BusinessTypeResponseSchema = Type.Object(BusinessTypeProperties);

// Enforce object with business_types array
const BusinessTypeObjectArrayResponseSchema = Type.Object({
  business_types: Type.Array(BusinessTypeResponseSchema)
});

const ErrorSchema = Type.Object({
  message: Type.String(),
  statusCode: Type.Number()
});

// TypeScript types
export type BusinessTypeResponse = Static<typeof BusinessTypeResponseSchema>;
export type BusinessTypeObjectArrayResponse = Static<typeof BusinessTypeObjectArrayResponseSchema>;

export const createBusinessTypeSchema: FastifySchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 })
  }, { additionalProperties: false }),
  response: {
    201: BusinessTypeResponseSchema
  },
  tags: ['Business Types'],
  description: 'Create a new business type',
  summary: 'Create business type',
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

export const BusinessTypeListSchema = Type.Object({
  business_types: Type.Array(BusinessTypeResponseSchema),
  pagination: Type.Optional(Type.Object({
    total: Type.Number({ description: 'Total number of partner applications available' }),
    offset: Type.Optional(Type.Number({ description: 'Current offset (number of applications skipped)' })),
    limit: Type.Optional(Type.Number({ description: 'Current limit (maximum number of applications returned)' }))
  }))
});

export const getBusinessTypesSchema: FastifySchema = {
  querystring: PaginationQuerySchema,
  response: {
    200: BusinessTypeListSchema
  },
  tags: ['Business Types'],
  description: 'Get all business types',
  summary: 'List business types'
  // No security property - publicly accessible
};

export const getBusinessTypeByIdSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  response: {
    200: BusinessTypeResponseSchema,
    404: ErrorSchema
  },
  tags: ['Business Types'],
  description: 'Get business type details by ID',
  summary: 'Get business type'
  // No security property - publicly accessible
};

export const updateBusinessTypeSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 })
  }, { additionalProperties: false }),
  response: {
    200: BusinessTypeResponseSchema,
    404: ErrorSchema
  },
  tags: ['Business Types'],
  description: 'Update an existing business type',
  summary: 'Update business type',
  security: [{ bearerAuth: [] }]
};

export const deleteBusinessTypeSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  response: {
    204: Type.Null(),
    404: ErrorSchema
  },
  tags: ['Business Types'],
  description: 'Delete a business type by ID',
  summary: 'Delete business type',
  security: [{ bearerAuth: [] }]
};