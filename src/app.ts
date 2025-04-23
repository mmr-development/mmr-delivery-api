import { join } from 'path';
import { FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { authenticationController, createAuthenticationTokenService, createRefreshTokenRepository } from './authentication';
import { createSignInMethodService } from './sign-in-method';
import { jwksController, createJwksService } from './jwks';
import { createUserRepository } from './users/user.repository';
import { createUserService } from './users/user.service';
import { createSignInMethodRepository } from './sign-in-method/sign-in-method.repository';
import { Database } from './types/kysely.types';
import { Kysely } from 'kysely';

export interface AppOptions { 
    db: Kysely<Database>;
};

export default async function buildApp(fastify: FastifyInstance, opts: AppOptions) {
    const { db } = opts
    
    /* Loads all plugins defined in the plugins directory. */
    fastify.register(AutoLoad, {
        dir: join(__dirname, 'plugins'),
        dirNameRoutePrefix: false,
        options: { ...opts },
    });

    fastify.register(authenticationController, {
        signInMethodService: createSignInMethodService(
            createAuthenticationTokenService(createRefreshTokenRepository(db)),
            createUserService(createUserRepository(db)),
            createSignInMethodRepository(db)
        ),
        authenticationTokenService: createAuthenticationTokenService(createRefreshTokenRepository(db)),
        userService: createUserService(createUserRepository(db)),
        prefix: '/auth',
    })

    fastify.register(jwksController, {
        service: createJwksService(),
    });
}
