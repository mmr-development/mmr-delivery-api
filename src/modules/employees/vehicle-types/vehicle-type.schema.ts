import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// Common response properties
const VehicleTypeProperties = {
  id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  // created_at: Type.String({ format: 'date-time' }),
  // updated_at: Type.String({ format: 'date-time' })
};

// Response schemas
const VehicleTypeResponseSchema = Type.Object(VehicleTypeProperties);

const VehiclesObjectResponseSchema = Type.Object({
  vehicle_types: Type.Array(VehicleTypeResponseSchema)
});

const ErrorSchema = Type.Object({
  message: Type.String(),
  statusCode: Type.Number()
});

const CreateVehicleTypeRequestSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 })
}, { additionalProperties: false });

// TypeScript types
export type VehicleTypeResponse = Static<typeof VehicleTypeResponseSchema>;
export type VehicleType = Static<typeof VehicleTypeResponseSchema>;
export type CreateVehicleTypeRequest = Static<typeof CreateVehicleTypeRequestSchema>;
export type UpdateVehicleTypeRequest = CreateVehicleTypeRequest;


export const createVehicleTypeSchema: FastifySchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 })
  }, { additionalProperties: false }),
  response: {
    201: VehicleTypeResponseSchema
  },
  tags: ['Courier Vehicle Types'],
  description: 'Create a new vehicle type',
  summary: 'Create vehicle type',
  security: [{ bearerAuth: [] }]
};

export const getVehicleTypesSchema: FastifySchema = {
  response: {
    200: VehiclesObjectResponseSchema
  },
  tags: ['Courier Vehicle Types'],
  description: 'Get all vehicle types',
  summary: 'List vehicle types'
  // No security property - publicly accessible
};

export const getVehicleTypeByIdSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  response: {
    200: VehicleTypeResponseSchema,
    404: ErrorSchema
  },
  tags: ['Courier Vehicle Types'],
  description: 'Get vehicle type details by ID',
  summary: 'Get vehicle type',
  // No security property - publicly accessible
};

export const updateVehicleTypeSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 })
  }, { additionalProperties: false }),
  response: {
    200: VehicleTypeResponseSchema,
    404: ErrorSchema
  },
  tags: ['Courier Vehicle Types'],
  description: 'Update an existing vehicle type',
  summary: 'Update vehicle type',
  security: [{ bearerAuth: [] }]
};

export const deleteVehicleTypeSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number({ minimum: 1 })
  }),
  response: {
    204: Type.Null(),
    404: ErrorSchema
  },
  tags: ['Courier Vehicle Types'],
  description: 'Delete a vehicle type',
  summary: 'Delete vehicle type',
  security: [{ bearerAuth: [] }]
};