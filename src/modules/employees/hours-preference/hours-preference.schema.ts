import { Type, Static } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

// Base schema for hour preference (for reading/responses)
export const HourPreferenceSchema = Type.Object({
    id: Type.Number({ description: 'Unique identifier for the hour preference' }),
    name: Type.String({ maxLength: 100, description: 'Name of the hour preference' }),
    description: Type.Union([
        Type.String({ maxLength: 255, description: 'Description of the hour preference' }),
        Type.Null()
    ], { description: 'Description or null' }),
});

// Schema for creating - omit id and created_at since they're auto-generated
export const CreateHourPreferenceSchema = Type.Object({
    name: Type.String({ maxLength: 100, description: 'Name of the hour preference' }),
    description: Type.Union([
        Type.String({ maxLength: 255, description: 'Description of the hour preference' }),
        Type.Null()
    ], { description: 'Description or null' }),
});

// Schema for updating an hour preference (all fields optional)
export const UpdateHourPreferenceSchema = Type.Object({
    name: Type.Optional(Type.String({ maxLength: 100, description: 'Name of the hour preference' })),
    description: Type.Optional(Type.Union([
        Type.String({ maxLength: 255, description: 'Description of the hour preference' }),
        Type.Null()
    ], { description: 'Description or null' })),
});

// Response schema for getting all hour preferences
export const GetAllHourPreferencesResponseSchema = Type.Object({
    hour_preferences: Type.Array(HourPreferenceSchema)
});

// Fastify schemas for Swagger documentation
export const createHourPreferenceSchema: FastifySchema = {
    body: CreateHourPreferenceSchema,
    response: {
        201: HourPreferenceSchema
    },
    tags: ['Hour Preferences'],
    summary: 'Create a new hour preference',
    description: 'Creates a new hour preference.'
};

export const updateHourPreferenceSchema: FastifySchema = {
    body: UpdateHourPreferenceSchema,
    response: {
        200: HourPreferenceSchema,
        404: Type.Object({
            message: Type.String(),
            statusCode: Type.Number()
        })
    },
    tags: ['Hour Preferences'],
    summary: 'Update an hour preference',
    description: 'Updates an existing hour preference.'
};

export const getAllHourPreferencesSchema: FastifySchema = {
    response: {
        200: GetAllHourPreferencesResponseSchema
    },
    tags: ['Hour Preferences'],
    summary: 'Get all hour preferences',
    description: 'Returns all hour preferences.'
};

export const getHourPreferenceByIdSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number({ minimum: 1, description: 'Hour preference ID' })
    }),
    response: {
        200: HourPreferenceSchema,
        404: Type.Object({
            message: Type.String(),
            statusCode: Type.Number()
        })
    },
    tags: ['Hour Preferences'],
    summary: 'Get hour preference by ID',
    description: 'Returns an hour preference by its ID.'
};

export const deleteHourPreferenceSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number({ minimum: 1, description: 'Hour preference ID' })
    }),
    response: {
        204: Type.Null(),
        404: Type.Object({
            message: Type.String(),
            statusCode: Type.Number()
        })
    },
    tags: ['Hour Preferences'],
    summary: 'Delete an hour preference',
    description: 'Deletes an hour preference by its ID.'
};

// TypeScript types derived from the schemas
export type HourPreference = Static<typeof HourPreferenceSchema>;
export type CreateHourPreference = Static<typeof CreateHourPreferenceSchema>;
export type UpdateHourPreference = Static<typeof UpdateHourPreferenceSchema>;