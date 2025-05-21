import { FastifyPluginAsync } from 'fastify';
import { CourierService, GetCouriersOptions, CreateCourierRequest } from './courier.service';
import util from 'node:util';

export interface CourierControllerOptions {
    courierService: CourierService;
}

export const courierController: FastifyPluginAsync<CourierControllerOptions> = async function (server, { courierService }) {
    server.post<{ Body: CreateCourierRequest }>(
        '/couriers/',
        {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'string' },
                        vehicle_type_id: { type: 'number' },
                        address_id: { type: 'number' },
                        schedule_preference_id: { type: 'number' },
                        hours_preference_id: { type: 'number' },
                        data_retention_consent: { type: 'boolean' },
                        is_eighteen_plus: { type: 'boolean' },
                        status: { type: 'string' }
                    },
                    required: [
                        'user_id',
                        'vehicle_type_id',
                        'address_id',
                        'schedule_preference_id',
                        'hours_preference_id',
                        'data_retention_consent',
                        'is_eighteen_plus',
                        'status'
                    ],
                    additionalProperties: false
                },
                tags: ['Couriers'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin', 'support')]
        },
        async (request, reply) => {
            const { body } = request;
            const courier = await courierService.createCourier(body);
            server.log.info(`Courier created: ${util.inspect(courier)}`);
            return reply.code(201).send(courier);
        }
    );

    server.get<{ Querystring: GetCouriersOptions }>(
        '/couriers/',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'string' },
                        status: { type: 'string' },
                        offset: { type: 'number', minimum: 0 },
                        limit: { type: 'number', minimum: 1 }
                    },
                    additionalProperties: false
                },
                tags: ['Couriers'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin', 'support')]
        },
        async (request, reply) => {
            const { couriers, total, limit, offset } = await courierService.getCouriers(request.query);
            server.log.info(`Couriers fetched: ${util.inspect(couriers)}`);
            return reply.code(200).send({
                couriers,
                pagination: {
                    total,
                    offset: offset ?? 0,
                    limit: limit ?? 10
                }
            });
        }
    );

    server.get<{ Params: { courier_id: number } }>(
        '/couriers/:courier_id/',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        courier_id: { type: 'number' }
                    },
                    required: ['courier_id']
                },
                tags: ['Couriers'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin', 'support')]
        },
        async (request, reply) => {
            const courier = await courierService.getCourierById(request.params.courier_id);
            server.log.info(`Courier fetched: ${util.inspect(courier)}`);
            return reply.code(200).send(courier);
        }
    );

    server.patch<{ Params: { courier_id: number }, Body: Partial<CreateCourierRequest> }>(
        '/couriers/:courier_id/',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        courier_id: { type: 'number' }
                    },
                    required: ['courier_id']
                },
                body: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'string' },
                        vehicle_type_id: { type: 'number' },
                        address_id: { type: 'number' },
                        schedule_preference_id: { type: 'number' },
                        hours_preference_id: { type: 'number' },
                        data_retention_consent: { type: 'boolean' },
                        is_eighteen_plus: { type: 'boolean' },
                        status: { type: 'string' }
                    },
                    additionalProperties: false
                },
                tags: ['Couriers'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin', 'support')]
        },
        async (request, reply) => {
            const courier = await courierService.updateCourier(request.params.courier_id, request.body);
            server.log.info(`Courier updated: ${util.inspect(courier)}`);
            return reply.code(200).send(courier);
        }
    );

    server.delete<{ Params: { courier_id: number } }>(
        '/couriers/:courier_id/',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        courier_id: { type: 'number' }
                    },
                    required: ['courier_id']
                },
                tags: ['Couriers'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            await courierService.deleteCourier(request.params.courier_id);
            server.log.info(`Courier deleted: ${request.params.courier_id}`);
            return reply.code(204).send();
        }
    );
};