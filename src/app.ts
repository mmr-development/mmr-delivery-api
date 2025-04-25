import { join } from 'path';
import { FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { authenticationController, createAuthenticationTokenService, createRefreshTokenRepository } from './modules/authentication';
import { createSignInMethodService, createSignInMethodRepository } from './modules/sign-in-method';
import { jwksController, createJwksService } from './modules/jwks';
import { createUserRepository } from './modules/users/user.repository';
import { createUserService } from './modules/users/user.service';
import { Database } from './database';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { config } from './config';

export interface AppOptions {
    config: typeof config;
};

export async function buildApp(fastify: FastifyInstance, opts: AppOptions) {
    const config = opts.config;

    const db = new Kysely<Database>({
        dialect: new PostgresDialect({
            pool: async () => new Pool(config.database),
        }),
    });

    /* Loads all plugins defined in the plugins directory. */
    fastify.register(AutoLoad, {
        dir: join(__dirname, 'plugins'),
        dirNameRoutePrefix: false,
        options: { ...opts, db },
    });

    fastify.register(authenticationController, {
        signInMethodService: createSignInMethodService(
            createAuthenticationTokenService(createRefreshTokenRepository(db)),
            createUserService(createUserRepository(db)),
            createSignInMethodRepository(db)
        ),
        authenticationTokenService: createAuthenticationTokenService(createRefreshTokenRepository(db)),
        userService: createUserService(createUserRepository(db)),
        prefix: '/api/v1',
    })

    fastify.register(jwksController, {
        service: createJwksService(),
    });

    return fastify;
}
