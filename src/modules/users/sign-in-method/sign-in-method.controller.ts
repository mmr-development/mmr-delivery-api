import { FastifyPluginAsync } from 'fastify';

export interface SignInMethodControllerOptions {

}

export const signInMethodController: FastifyPluginAsync<SignInMethodControllerOptions> = async function (server) {
    server.post('/users/:user_id/sign-in-methods/', { schema: { tags: ['Users'], security: [{ bearerAuth: [] }] }, preHandler: [server.authenticate] }, async (request, reply) => {

    });
}
