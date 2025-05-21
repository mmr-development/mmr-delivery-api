import { FastifyPluginAsync } from 'fastify';
import { RoleService, CreateRoleRequest, GetRolesOptions } from './role.service';
import util from 'node:util';

export interface RoleControllerOptions {
    roleService: RoleService;
}

export const roleController: FastifyPluginAsync<RoleControllerOptions> = async function (server, { roleService }) {
    server.post<{ Body: CreateRoleRequest }>(
        '/roles/',
        {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' }
                    },
                    required: ['name', 'description'],
                    additionalProperties: false
                },
                tags: ['Roles'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const { body } = request;
            const role = await roleService.createRole(body);
            server.log.info(`Role created: ${util.inspect(role)}`);
            return reply.code(201).send(role);
        }
    );

    server.get<{ Querystring: GetRolesOptions }>(
        '/roles/',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        offset: { type: 'number', minimum: 0 },
                        limit: { type: 'number', minimum: 1 }
                    },
                    additionalProperties: false
                },
                tags: ['Roles'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const { roles, total, limit, offset } = await roleService.getRoles(request.query);
            server.log.info(`Roles fetched: ${util.inspect(roles)}`);
            return reply.code(200).send({
                roles,
                pagination: {
                    total,
                    offset: offset ?? 0,
                    limit: limit ?? 10
                }
            });
        }
    );

    server.get<{ Params: { role_id: string } }>(
        '/roles/:role_id/',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        role_id: { type: 'string' }
                    },
                    required: ['role_id']
                },
                tags: ['Roles'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const role = await roleService.getRoleById(request.params.role_id);
            server.log.info(`Role fetched: ${util.inspect(role)}`);
            return reply.code(200).send(role);
        }
    );

    server.patch<{ Params: { role_id: string }, Body: Partial<CreateRoleRequest> }>(
        '/roles/:role_id/',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        role_id: { type: 'string' }
                    },
                    required: ['role_id']
                },
                body: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' }
                    },
                    additionalProperties: false
                },
                tags: ['Roles'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const role = await roleService.updateRole(request.params.role_id, request.body);
            server.log.info(`Role updated: ${util.inspect(role)}`);
            return reply.code(200).send(role);
        }
    );

    server.delete<{ Params: { role_id: string } }>(
        '/roles/:role_id/',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        role_id: { type: 'string' }
                    },
                    required: ['role_id']
                },
                tags: ['Roles'],
                security: [{ bearerAuth: [] }]
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            await roleService.deleteRole(request.params.role_id);
            server.log.info(`Role deleted: ${request.params.role_id}`);
            return reply.code(204).send();
        }
    );
};