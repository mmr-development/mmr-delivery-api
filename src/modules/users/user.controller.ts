import { FastifyPluginAsync } from 'fastify';
import { UserService } from './user.service';
import { getAllUsersSchema, getUserByIdSchema } from './user.schema';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export interface UserControllerOptions {
    userService: UserService;
}

export const userController: FastifyPluginAsync<UserControllerOptions> = async function (server, { userService }) {

    server.withTypeProvider<TypeBoxTypeProvider>().post<{ Body: { email: string, first_name: string, last_name: string, phone_number: string } }>(
        '/users/',
        {
            schema: {
                tags: ['Users'],
                body: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email' },
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        phone_number: { type: 'string', pattern: '^\\+?[0-9]*$' }
                    },
                    required: ['email', 'first_name', 'last_name'],
                    additionalProperties: false
                }
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const userData = request.body;

            const user = await request.db.transaction().execute(async (trx) => {
                return await userService.createAnonymousUser(trx, userData)
            })

            return reply.code(201).send(user);
        });

    server.withTypeProvider<TypeBoxTypeProvider>().get('/users/', { schema: { ...getAllUsersSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const query = request.query;
        try {
            const { users, count } = await userService.findAllUsers(query);

            return reply.code(200).send({
                users,
                pagination: {
                    total: count,
                    offset: query.offset,
                    limit: query.limit,
                }
            });
        } catch (error) {

        }
    });

    server.withTypeProvider<TypeBoxTypeProvider>().get<{ Params: { user_id: string } }>('/users/:user_id/', { schema: { ...getUserByIdSchema }, preHandler: [server.authenticate, server.guard.role('admin', 'support')] }, async (request, reply) => {
        const user = await userService.findUserById(request.params.user_id);

        if (!user) {
            return reply.code(404).send({ message: 'User not found' });
        }

        return reply.code(200).send(user);
    });

    server.withTypeProvider<TypeBoxTypeProvider>().get<{ Querystring: { q: string } }>('/address-autocomplete', { schema: { tags: ['Dawa'] } }, async (request, reply) => {
        const { query } = request;
        const { q } = query as { q?: string; };
        console.log('Query:', query);
        const response = await fetch(`https://api.dataforsyningen.dk/autocomplete?q=${q}`);
        console.log('Response:', response);
        if (!response.ok) {
            return reply.code(500).send({ message: 'Error fetching address data' });
        }
        const data = await response.json();
        return reply.code(200).send(data);
    })

    server.withTypeProvider<TypeBoxTypeProvider>().get('/users/profile/', {
        schema: {
            tags: ['Users'],
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        try {
            // Get the authenticated user's ID from the request
            const userId = request.user.sub;

            // Fetch the user profile using the UserService
            const user = await userService.findUserWithAddressById(userId);

            if (!user) {
                return reply.code(404).send({
                    message: 'User profile not found',
                    statusCode: 404
                });
            }

            // Return the user profile
            return reply.code(200).send(user);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                message: 'Failed to fetch user profile',
                statusCode: 500
            });
        }
    });

    server.withTypeProvider<TypeBoxTypeProvider>().patch<{
        Body: {
            first_name?: string,
            last_name?: string,
            email?: string,
            phone_number?: string,
            address?: {
                address_detail?: string,
                latitude?: number,
                longitude?: number,
                street?: string,
                postal_code?: string,
                city?: string,
                country?: string,
                country_iso?: string
            }
        }
    }>(
        '/users/profile/',
        {
            schema: {
                tags: ['Users'],
                body: {
                    type: 'object',
                    properties: {
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone_number: { type: 'string', pattern: '^\\+?[0-9]*$' },
                        address: {
                            type: 'object',
                            properties: {
                                address_detail: { type: 'string' },
                                latitude: { type: 'number' },
                                longitude: { type: 'number' },
                                street: { type: 'string' },
                                postal_code: { type: 'string' },
                                city: { type: 'string' },
                                country: { type: 'string' },
                                country_iso: { type: 'string' }
                            },
                            additionalProperties: false
                        }
                    },
                    additionalProperties: false
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    first_name: { type: 'string' },
                                    last_name: { type: 'string' },
                                    email: { type: 'string' },
                                    phone_number: { type: 'string' },
                                    address: {
                                        type: 'object',
                                        properties: {
                                            street: { type: 'string' },
                                            address_detail: { type: 'string' },
                                            postal_code: { type: 'string' },
                                            city: { type: 'string' },
                                            country: { type: 'string' },
                                            country_iso: { type: 'string' },
                                            latitude: { type: 'number' },
                                            longitude: { type: 'number' }
                                        }
                                    },
                                    created_at: { type: 'string', format: 'date-time' },
                                    updated_at: { type: 'string', format: 'date-time' }
                                }
                            }
                        }
                    }
                }
            },
            preHandler: [server.authenticate]
        },
        async (request, reply) => {
            const userId = request.user.sub;
            const userData = {
                ...request.body
            };

            try {
                const updatedUser = await userService.updateUserProfile(userId, userData);

                if (!updatedUser) {
                    return reply.code(404).send({
                        message: 'User profile not found',
                        statusCode: 404
                    });
                }

                return reply.code(200).send({
                    message: 'User profile updated successfully',
                    user: updatedUser.user
                });
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({
                    message: 'Failed to update user profile',
                    statusCode: 500
                });
            }
        }
    );

    server.withTypeProvider<TypeBoxTypeProvider>().post<{ Params: { user_id: string }, Body: { role_name: string } }>(
        '/users/:user_id/roles',
        {
            schema: {
                tags: ['Users'],
                summary: 'Assign a role to a user',
                body: {
                    type: 'object',
                    properties: {
                        role_name: { type: 'string' }
                    },
                    required: ['role_name']
                }
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const { user_id } = request.params;
            const { role_name } = request.body;
            try {
                await request.db.transaction().execute(async (trx) => {
                    await userService.assignRoleToUser(trx, user_id, role_name);
                });
                return reply.code(204).send();
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ message: 'Failed to assign role' });
            }
        }
    );

    server.withTypeProvider<TypeBoxTypeProvider>().patch<{ Params: { user_id: string }, Body: { roles: string[] } }>(
        '/users/:user_id/roles/',
        {
            schema: {
                tags: ['Users'],
                summary: 'Update user roles',
                body: {
                    type: 'object',
                    properties: {
                        roles: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    },
                    required: ['roles']
                }
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const { user_id } = request.params;
            const { roles } = request.body;

            try {
                if (roles.length === 0) {
                    return reply.code(200).send({ message: 'No roles to update' });
                }

                await request.db.transaction().execute(async (trx) => {
                    // First remove all existing roles
                    await userService.removeAllUserRoles(trx, user_id);

                    // Then assign the new roles
                    for (const role_id of roles) {
                        await userService.assignRoleToUser(trx, user_id, role_id);
                    }
                });

                return reply.code(200).send({ message: 'User roles updated successfully' });
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ message: 'Failed to update user roles' });
            }
        }
    );

    // Change from '/users/' to '/users/:id/'
    server.withTypeProvider<TypeBoxTypeProvider>().patch<{
        Params: { id: string },
        Body: {
            first_name?: string,
            last_name?: string,
            email?: string,
            phone_number?: string,
            status?: string,
            address?: {  // Add address object
                street?: string,
                address_detail?: string,
                postal_code?: string,
                city?: string,
                country?: string,
                country_iso?: string,
                latitude?: number,
                longitude?: number
            }
        }
    }>(
        '/users/:id/',
        {
            schema: {
                tags: ['Users'],
                summary: 'Update user details (Admin only)',
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    },
                    required: ['id']
                },
                body: {
                    type: 'object',
                    properties: {
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone_number: { type: 'string', pattern: '^\\+?[0-9]*$' },
                        status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string' },
                                address_detail: { type: 'string' },
                                postal_code: { type: 'string' },
                                city: { type: 'string' },
                                country: { type: 'string' },
                                country_iso: { type: 'string' },
                                latitude: { type: 'number' },
                                longitude: { type: 'number' }
                            },
                            additionalProperties: false
                        }
                    },
                    additionalProperties: false
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    first_name: { type: 'string' },
                                    last_name: { type: 'string' },
                                    email: { type: 'string' },
                                    phone_number: { type: 'string' },
                                    status: { type: 'string' },
                                    address: {  // Add address to response schema
                                        type: 'object',
                                        properties: {
                                            street: { type: 'string' },
                                            address_detail: { type: 'string' },
                                            postal_code: { type: 'string' },
                                            city: { type: 'string' },
                                            country: { type: 'string' },
                                            country_iso: { type: 'string' },
                                            latitude: { type: 'number' },
                                            longitude: { type: 'number' }
                                        }
                                    },
                                    created_at: { type: 'string', format: 'date-time' },
                                    updated_at: { type: 'string', format: 'date-time' }
                                }
                            }
                        }
                    }
                }
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            // Get ID from params instead of body
            const id = request.params.id;
            const userData = request.body;

            try {
                const updatedUser = await userService.updateUserById(id, userData);

                if (!updatedUser) {
                    return reply.code(404).send({
                        message: 'User not found',
                        statusCode: 404
                    });
                }

                return reply.code(200).send({
                    message: 'User updated successfully',
                    user: updatedUser.user,
                    address: updatedUser.user.address
                });
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({
                    message: 'Failed to update user',
                    statusCode: 500
                });
            }
        }
    );

    server.withTypeProvider<TypeBoxTypeProvider>().post<{ Body: { token: string, app_type: string } }>(
        '/users/push-token/',
        {
            schema: {
                tags: ['Users'],
                summary: 'Register Expo push token for the authenticated user',
                body: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        app_type: { type: 'string', enum: ['customer', 'courier'] }
                    },
                    required: ['token', 'app_type']
                }
            },
            preHandler: [server.authenticate]
        },
        async (request, reply) => {
            const userId = request.user.sub;
            const { token, app_type } = request.body;
            await userService.savePushToken(userId, token, app_type);
            return reply.code(204).send();
        }
    );
}
