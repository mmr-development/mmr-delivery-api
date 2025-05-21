import { FastifyPluginAsync } from 'fastify';
import { CourierScheduleService, GetSchedulesOptions, CreateCourierScheduleRequest } from './courier-schedule.service';
import util from 'node:util';

export interface CourierScheduleControllerOptions {
    courierScheduleService: CourierScheduleService;
}

export const courierScheduleController: FastifyPluginAsync<CourierScheduleControllerOptions> = async function (server, { courierScheduleService }) {
    server.post<{ Body: CreateCourierScheduleRequest }>(
        '/couriers/schedules/',
        {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        courier_id: { type: 'number' },
                        start_datetime: { type: 'string', format: 'date-time' },
                        end_datetime: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'canceled'] },
                        notes: { type: 'string' }
                    },
                    required: ['courier_id', 'start_datetime', 'end_datetime', 'status']
                },
                tags: ['Courier Schedules'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin', 'courier', 'support')]
        },
        async (request, reply) => {
            const { body } = request;
            const schedule = await courierScheduleService.createSchedule(body);
            server.log.info(`Schedule created: ${util.inspect(schedule)}`);
            return reply.code(201).send(schedule);
        }
    );

    server.get<{ Querystring: GetSchedulesOptions }>(
        '/couriers/schedules/',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        courier_id: { type: 'number' },
                        from_date: { type: 'string', format: 'date-time' },
                        to_date: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'canceled'] },
                        offset: { type: 'number', minimum: 0 },
                        limit: { type: 'number', minimum: 1 }
                    },
                },
                tags: ['Courier Schedules'],
                security: [{ bearerAuth: [] }],
            },
            preHandler: [server.authenticate, server.guard.role('admin', 'courier', 'support')]
        },
        async (request, reply) => {
            const { schedules, total, limit, offset } = await courierScheduleService.getSchedules(request.query);
            server.log.info(`Schedules fetched: ${util.inspect(schedules)}`);
            return reply.code(200).send({
                schedules,
                pagination: {
                    total,
                    offset: offset ?? 0,
                    limit: limit ?? 10
                }
            });
        }
    );

    server.get<{ Params: { schedule_id: number } }>('/couriers/schedules/:schedule_id/', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    schedule_id: { type: 'number' }
                }
            },
            tags: ['Courier Schedules'],
            security: [{ bearerAuth: [] }],
        },
        preHandler: [server.authenticate, server.guard.role('admin', 'courier', 'support')]
    }, async (request, reply) => {
        const schedule = await courierScheduleService.getScheduleById(request.params.schedule_id);
        server.log.info(`Schedule fetched: ${util.inspect(schedule)}`);
        return reply.code(200).send(schedule);
    })

    server.patch<{ Params: { schedule_id: number }, Body: Partial<CreateCourierScheduleRequest> }>('/couriers/schedules/:schedule_id/', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    schedule_id: { type: 'number' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    start_datetime: { type: 'string', format: 'date-time' },
                    end_datetime: { type: 'string', format: 'date-time' },
                    status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'canceled'] },
                    notes: { type: 'string' }
                }
            },
            tags: ['Courier Schedules'],
            security: [{ bearerAuth: [] }],
        },
        preHandler: [server.authenticate, server.guard.role('admin', 'courier', 'support')]
    }, async (request, reply) => {
        const schedule = await courierScheduleService.updateSchedule(request.params.schedule_id, request.body);
        server.log.info(`Schedule updated: ${util.inspect(schedule)}`);
        return reply.code(200).send(schedule);
    })

    server.delete<{ Params: { schedule_id: number } }>('/couriers/schedules/:schedule_id/', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    schedule_id: { type: 'number' }
                }
            },
            tags: ['Courier Schedules'],
            security: [{ bearerAuth: [] }],
        },
        preHandler: [server.authenticate, server.guard.role('admin', 'courier', 'support')]
    }, async (request, reply) => {
        const schedule = await courierScheduleService.deleteSchedule(request.params.schedule_id);
        server.log.info(`Schedule deleted: ${util.inspect(schedule)}`);
        return reply.code(200).send(schedule);
    })
};
