import { Type, Static } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

// Base schedule schema
export const CourierScheduleSchema = Type.Object({
    id: Type.Number(),
    courier_id: Type.Number(),
    start_datetime: Type.Unsafe<Date>({ format: 'date-time' }),
    end_datetime: Type.Unsafe<Date>({ format: 'date-time' }),
    status: Type.String({ enum: ['scheduled', 'confirmed', 'completed', 'canceled'] }),
    notes: Type.Union([Type.String(), Type.Null()]),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
});

// Create schedule schema
export const CreateCourierScheduleSchema = Type.Object({
    courier_id: Type.Number(),
    start_datetime: Type.Unsafe<Date>({ format: 'date-time' }),
    end_datetime: Type.Unsafe<Date>({ format: 'date-time' }),
    notes: Type.Optional(Type.String()),
});

// Update schedule schema
export const UpdateCourierScheduleSchema = Type.Object({
    start_datetime: Type.Optional(Type.Unsafe<Date>({ format: 'date-time' })),
    end_datetime: Type.Optional(Type.Unsafe<Date>({ format: 'date-time' })),
    status: Type.Optional(Type.String({ enum: ['scheduled', 'confirmed', 'completed', 'canceled'] })),
    notes: Type.Optional(Type.String()),
});

// Time entry schemas remain the same
export const TimeEntrySchema = Type.Object({
    id: Type.Number(),
    courier_id: Type.Number(),
    schedule_id: Type.Union([Type.Number(), Type.Null()]),
    clock_in: Type.String({ format: 'date-time' }),
    clock_out: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    notes: Type.Union([Type.String(), Type.Null()]),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
});

export const ClockInSchema = Type.Object({
    schedule_id: Type.Optional(Type.Number()),
    notes: Type.Optional(Type.String()),
});

export const ClockOutSchema = Type.Object({
    notes: Type.Optional(Type.String()),
});

// Response schemas
export const CourierScheduleListResponseSchema = Type.Object({
    schedules: Type.Array(CourierScheduleSchema),
    pagination: Type.Object({
        total: Type.Number(),
        offset: Type.Optional(Type.Number()),
        limit: Type.Optional(Type.Number()),
    })
});

export const TimeEntriesResponseSchema = Type.Object({
    time_entries: Type.Array(TimeEntrySchema),
    pagination: Type.Object({
        total: Type.Number(),
        offset: Type.Optional(Type.Number()),
        limit: Type.Optional(Type.Number()),
    })
});

// Fastify schemas
export const createScheduleSchema: FastifySchema = {
    body: CreateCourierScheduleSchema,
    response: {
        201: CourierScheduleSchema
    },
    tags: ['Courier Scheduling'],
    description: 'Create a new schedule for a courier',
    summary: 'Create schedule'
};

export const getSchedulesSchema: FastifySchema = {
    querystring: Type.Object({
        courier_id: Type.Optional(Type.Number()),
        from_datetime: Type.Optional(Type.String({ format: 'date-time' })),
        to_datetime: Type.Optional(Type.String({ format: 'date-time' })),
        status: Type.Optional(Type.String({ enum: ['scheduled', 'confirmed', 'completed', 'canceled'] })),
        offset: Type.Optional(Type.Number({ default: 0 })),
        limit: Type.Optional(Type.Number({ default: 20 })),
    }),
    response: {
        200: CourierScheduleListResponseSchema
    },
    tags: ['Courier Scheduling'],
    description: 'Get schedules with optional filtering',
    summary: 'Get schedules'
};

// Types
export type CourierSchedule = Static<typeof CourierScheduleSchema>;
export type CreateCourierSchedule = Static<typeof CreateCourierScheduleSchema>;
export type UpdateCourierSchedule = Static<typeof UpdateCourierScheduleSchema>;
export type TimeEntry = Static<typeof TimeEntrySchema>;
export type ClockIn = Static<typeof ClockInSchema>;
export type ClockOut = Static<typeof ClockOutSchema>;
