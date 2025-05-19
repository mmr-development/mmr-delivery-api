import fp from 'fastify-plugin';
import fastifyGuard from 'fastify-guard';
import { FastifyPluginAsync } from 'fastify';

export const guardPlugin: FastifyPluginAsync = async function (server) {
    server.register(fastifyGuard, {
        requestProperty: 'user',
        roleProperty: 'roles',
        errorHandler: (error, request, reply) => {
            reply.status(403).send({
                statusCode: 403,
                error: "Forbidden",
                message: "You do not have sufficient permissions to perform this action"
            });
        }
    })
}

export default fp(guardPlugin, {
    name: 'guardPlugin',
});
