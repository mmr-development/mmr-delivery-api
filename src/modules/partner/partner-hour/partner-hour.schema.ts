import { Type, Static } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

// Partner Hour base schema
export const PartnerHourBaseSchema = Type.Object({
    day_of_week: Type.Integer({ minimum: 0, maximum: 6, description: '0=Sunday, 6=Saturday' }),
    opens_at: Type.String({
        pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$',
        description: 'Opening time (HH:MM or HH:MM:SS, 24-hour)'
    }),
    closes_at: Type.String({
        pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$',
        description: 'Closing time (HH:MM or HH:MM:SS, 24-hour)'
    }),
});

// Create
export const CreatePartnerHourSchema = Type.Intersect([
    PartnerHourBaseSchema,
    Type.Object({})
]);

// Update (all fields optional)
export const UpdatePartnerHourSchema = Type.Partial(PartnerHourBaseSchema);

// Response
export const PartnerHourResponseSchema = Type.Object({
    id: Type.Number(),
    partner_id: Type.Number(),
    day_of_week: Type.Integer(),
    opens_at: Type.String(),
    closes_at: Type.String(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
});

// List response
export const PartnerHourListResponseSchema = Type.Object({
    hours: Type.Array(PartnerHourResponseSchema)
});

// Types
export type CreatePartnerHour = Static<typeof CreatePartnerHourSchema>;
export type UpdatePartnerHour = Static<typeof UpdatePartnerHourSchema>;
export type PartnerHourResponse = Static<typeof PartnerHourResponseSchema>;

// Fastify schemas

export const createPartnerHourSchema: FastifySchema = {
    summary: 'Create partner hour',
    body: CreatePartnerHourSchema,
    response: {
        201: PartnerHourResponseSchema
    }
};

export const getPartnerHoursSchema: FastifySchema = {
    summary: 'Get all partner hours for a partner',
    response: {
        200: PartnerHourListResponseSchema
    }
};

export const getPartnerHourByIdSchema: FastifySchema = {
    summary: 'Get a specific partner hour',
    response: {
        200: PartnerHourResponseSchema
    }
};

export const updatePartnerHourSchema: FastifySchema = {
    summary: 'Update a partner hour',
    body: UpdatePartnerHourSchema,
    response: {
        200: PartnerHourResponseSchema
    }
};

export const deletePartnerHourSchema: FastifySchema = {
    summary: 'Delete a partner hour',
    response: {
        204: Type.Null()
    }
};

export type CreatePartnerHourRequest = Static<typeof CreatePartnerHourSchema>;
export type UpdatePartnerHourRequest = Static<typeof UpdatePartnerHourSchema>;
