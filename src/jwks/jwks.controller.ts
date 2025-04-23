import { FastifyPluginAsync } from 'fastify';
import { JwksService } from './jwks.service';

export interface JwksControllerOptions {
  service: JwksService;
}

export const jwksController: FastifyPluginAsync<JwksControllerOptions> = async function (server, { service }) {
  server.get('/.well-known/jwks.json', async (request, reply) => {
    const jwks = await service.getJwks();

    return reply.code(200).send(jwks);
  });
};
