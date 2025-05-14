import { FastifyPluginAsync } from 'fastify';
import { UserService } from './user.service';
import { getAllUsersSchema, getUserByIdSchema } from './user.schema';

export interface UserControllerOptions {
    userService: UserService;
}

export const userController: FastifyPluginAsync<UserControllerOptions> = async function (server, { userService }) {
    server.get<{ Querystring: { offset: number, limit: number, email?: string, name?: string, phone_number?: string } }>('/users/', { schema: { ...getAllUsersSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const { offset, limit, email, name, phone_number } = request.query;
        const { users, count } = await userService.findAllUsers({
            offset, limit,
            filters: {
                email,
                name,
                phone_number
            }
        });

        return reply.code(200).send({
            users,
            pagination: {
                total: count,
                offset,
                limit
            }
        });
    });

    server.get<{ Params: { user_id: string } }>('/users/:user_id/', { schema: { ...getUserByIdSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const user = await userService.findUserById(request.params.user_id);

        if (!user) {
            return reply.code(404).send({ message: 'User not found' });
        }

        return reply.code(200).send(user);
    });
}
