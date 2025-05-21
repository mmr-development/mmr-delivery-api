import { FastifyPluginAsync } from 'fastify';
import { UserService } from './user.service';
import { getAllUsersSchema, getUserByIdSchema } from './user.schema';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export interface UserControllerOptions {
    userService: UserService;
}

export const userController: FastifyPluginAsync<UserControllerOptions> = async function (server, { userService }) {
    server.withTypeProvider<TypeBoxTypeProvider>().get('/users/', { schema: { ...getAllUsersSchema }, preHandler: [server.authenticate, server.guard.role('admin', 'support')] }, async (request, reply) => {
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
            const user = await userService.findUserById(userId);

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

    server.withTypeProvider<TypeBoxTypeProvider>().post<{ Params: { user_id: string }, Body: { role_id: string } }>(
        '/users/:user_id/roles',
        {
            schema: {
                tags: ['Users'],
                summary: 'Assign a role to a user',
                body: {
                    type: 'object',
                    properties: {
                        role_id: { type: 'string' }
                    },
                    required: ['role_id']
                }
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const { user_id } = request.params;
            const { role_id } = request.body;
            try {
                await userService.assignRoleToUser(user_id, role_id);
                return reply.code(204).send();
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ message: 'Failed to assign role' });
            }
        }
    );
}
