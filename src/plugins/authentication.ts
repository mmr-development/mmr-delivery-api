import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fs from 'fs';
import path from 'path';
import fastifyRedis from '@fastify/redis';
import { Config } from '../config';

interface AuthenticationPluginOptions {
    config: Pick<Config, 'redis' | 'jwt'>;
  }

declare module 'fastify' {
    export interface FastifyInstance {
        authenticate: any;
    }
}

declare module 'fastify' {
    interface FastifyRequest {
      revokeToken(): Promise<boolean>
    }
  }
  
declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            sub: string;
            jti: string;
            exp: number;
        }
    }
}

const BLACKLIST_PREFIX = 'jwt:blacklist:';

export const authenticationPlugin: FastifyPluginAsync<AuthenticationPluginOptions> = async function (server, opts) {
    const { config } = opts;

    if (!server.redis) {
        server.register(fastifyRedis, {
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
        });
    }

    let secret: string;
    let publicKey: string;
    try {
        const keyPath = path.resolve(process.cwd(), 'keys', 'private.pem');
        secret = fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
        server.log.error('Failed to load private key:', error);
        throw new Error('Authentication plugin initialization failed: Could not load private key');
    }

    server.register(fastifyJwt, {
        secret: {
            private: secret,
            public: fs.readFileSync(path.resolve(process.cwd(), 'keys', 'public.pem'), 'utf8'),
        },
        trusted: async function (request, token) {
            if (!token.jti) return true;
            const key = `${BLACKLIST_PREFIX}${token.jti}`;
            return !(await request.server.redis.exists(key));
        }
    });

    server.decorate('authenticate', async function authenticate(request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });

    server.decorateRequest('revokeToken', async function () {
        if (this.user && this.user.jti) {
            const key = `${BLACKLIST_PREFIX}${this.user.jti}`;
            const expireTime = this.user.exp ? this.user.exp - Math.floor(Date.now() / 1000) : 3600;
            await this.server.redis.set(key, '1', 'EX', expireTime > 0 ? expireTime : 3600);
            return true;
        }
        return false;
    });
}

export default fp(authenticationPlugin);
