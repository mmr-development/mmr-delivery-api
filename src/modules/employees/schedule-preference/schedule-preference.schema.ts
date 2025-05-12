import { Type, Static } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

export const SchedulePreferenceSchema = Type.Object({
    id: Type.Optional(Type.Number({ description: 'Unique identifier for the schedule preference' })),
    name: Type.String({ maxLength: 100, description: 'Name of the schedule preference' }),
    description: Type.Union([
        Type.String({ maxLength: 255, description: 'Description of the schedule preference' }),
        Type.Null()
    ], { description: 'Description or null' }),
});

// Schema for creating a new schedule preference
export const CreateSchedulePreferenceSchema = Type.Object({
    name: Type.String({ maxLength: 100, description: 'Name of the schedule preference' }),
    description: Type.Union([
        Type.String({ maxLength: 255, description: 'Description of the schedule preference' }),
        Type.Null()
    ], { description: 'Description or null' }),
});

// Schema for updating a schedule preference (all fields optional, with descriptions)
export const UpdateSchedulePreferenceSchema = Type.Object({
    name: Type.Optional(Type.String({ maxLength: 100, description: 'Name of the schedule preference' })),
    description: Type.Optional(Type.Union([
        Type.String({ maxLength: 255, description: 'Description of the schedule preference' }),
        Type.Null()
    ], { description: 'Description or null' })),
});

// Response schema for getting all schedule preferences
export const GetAllSchedulePreferencesResponseSchema = Type.Object({
    schedule_preferences: Type.Array(SchedulePreferenceSchema)
});

// Fastify schemas for Swagger documentation
export const createSchedulePreferenceSchema: FastifySchema = {
    body: CreateSchedulePreferenceSchema,
    response: {
        201: SchedulePreferenceSchema
    },
    tags: ['Schedule Preferences'],
    summary: 'Create a new schedule preference',
    description: 'Creates a new schedule preference.'
};

export const updateSchedulePreferenceSchema: FastifySchema = {
    body: UpdateSchedulePreferenceSchema,
    response: {
        200: SchedulePreferenceSchema,
        404: Type.Object({
            message: Type.String(),
            statusCode: Type.Number()
        })
    },
    tags: ['Schedule Preferences'],
    summary: 'Update a schedule preference',
    description: 'Updates an existing schedule preference.'
};

export const getAllSchedulePreferencesSchema: FastifySchema = {
    response: {
        200: GetAllSchedulePreferencesResponseSchema
    },
    tags: ['Schedule Preferences'],
    summary: 'Get all schedule preferences',
    description: 'Returns all schedule preferences.'
};

export const getSchedulePreferenceByIdSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number({ minimum: 1, description: 'Schedule preference ID' })
    }),
    response: {
        200: SchedulePreferenceSchema,
        404: Type.Object({
            message: Type.String(),
            statusCode: Type.Number()
        })
    },
    tags: ['Schedule Preferences'],
    summary: 'Get schedule preference by ID',
    description: 'Returns a schedule preference by its ID.'
};

export const deleteSchedulePreferenceSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number({ minimum: 1, description: 'Schedule preference ID' })
    }),
    response: {
        204: Type.Null(),
        404: Type.Object({
            message: Type.String(),
            statusCode: Type.Number()
        })
    },
    tags: ['Schedule Preferences'],
    summary: 'Delete a schedule preference',
    description: 'Deletes a schedule preference by its ID.'
};

// TypeScript types derived from the schemas
export type SchedulePreference = Static<typeof SchedulePreferenceSchema>;
export type CreateSchedulePreference = Static<typeof CreateSchedulePreferenceSchema>;
export type UpdateSchedulePreference = Static<typeof UpdateSchedulePreferenceSchema>;
export type GetAllSchedulePreferencesResponse = Static<typeof GetAllSchedulePreferencesResponseSchema>;