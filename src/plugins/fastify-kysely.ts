import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Kysely } from 'kysely';
import { Database } from '../types/kysely.types';
import { db } from '../database';

// Extend the FastifyInstance type to include the kysely namespace
declare module 'fastify' {
    interface FastifyInstance {
        kysely: {
            db: Kysely<Database>;
        };
    }
}

const fastifyKysely: FastifyPluginAsync = async (fastify) => {
    const kyselyNamespace = {
        db: db
    };

    fastify.decorate('kysely', kyselyNamespace);

    fastify.addHook('onClose', async (instance) => {
        await instance.kysely.db.destroy();
    });
};

export default fp(fastifyKysely, {
    name: 'fastify-kysely',
    dependencies: []
});
