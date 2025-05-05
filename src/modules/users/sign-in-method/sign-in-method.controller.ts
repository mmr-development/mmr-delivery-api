import { FastifyPluginAsync } from 'fastify';

export interface SignInMethodControllerOptions {

}

export const signInMethodController: FastifyPluginAsync<SignInMethodControllerOptions> = async function (server) {
    server.post('/users/:userId/sign-in-methods/', { schema: { tags: ['Users'] } }, async (request, reply) => {

    });
}
