import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

import { FastifyRequest } from 'fastify';
import { errorResponseBuilderContext } from '@fastify/rate-limit';

interface RateLimitOptions {
    max?: number;
    timeWindow?: string | number;
    whitelist?: string[];
    enableDraftSpec?: boolean;
    errorResponseBuilder?: (
        req: FastifyRequest,
        context: errorResponseBuilderContext
    ) => object;
}

export const rateLimitPlugin: FastifyPluginAsync<RateLimitOptions> = async (fastify, options = {}) => {
    const defaultOptions = {
        max: 400,
        timeWindow: '1 minute'
    };

    await fastify.register(fastifyRateLimit, {
        ...defaultOptions,
        ...options
    });
};

export default fp(rateLimitPlugin);
