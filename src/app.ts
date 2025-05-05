import { join } from 'path';
import { FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { authenticationController, createAuthenticationTokenService, createRefreshTokenRepository, createPasswordResetService, createPasswordResetTokenRepository } from './modules/authentication';
import { createSignInMethodService, createSignInMethodRepository, signInMethodController } from './modules/users/sign-in-method';
import { jwksController, createJwksService } from './modules/jwks';
import { userController, createUserService, createUserRepository } from './modules/users';
import { Database } from './database';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { config } from './config';
import { partnerController } from './modules/partner';
import { employeeController } from './modules/employees';
import { createEmailService } from './modules/email';
import { createPartnerApplicationService, createPartnerApplicationRepository } from './modules/partner';
import { createDeliveryMethodService } from './modules/partner/delivery-method';
import { createBusinessTypeService } from './modules/partner/business-type';
import { createCatalogService } from './modules/partner/catalog';
// import { createPartnerService } from './modules/partner/partner.service';

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
        options: { ...opts, db, config },
    });

    fastify.register(authenticationController, {
        signInMethodService: createSignInMethodService(
            createAuthenticationTokenService(createRefreshTokenRepository(db)),
            createUserService(createUserRepository(db)),
            createSignInMethodRepository(db)
        ),
        authenticationTokenService: createAuthenticationTokenService(createRefreshTokenRepository(db)),
        userService: createUserService(createUserRepository(db)),
        passwordResetService: createPasswordResetService(createPasswordResetTokenRepository(db), createEmailService(config)),
        prefix: '/v1',
    })

    fastify.register(partnerController, {
        partnerApplicationService: createPartnerApplicationService(createPartnerApplicationRepository(db), createUserService(createUserRepository(db))),
        deliveryMethodService: createDeliveryMethodService(db),
        businessTypeService: createBusinessTypeService(db),
        catalogService: createCatalogService(db),
        // partnerService: createPartnerService(db), 
        prefix: '/v1'
    })

    fastify.register(employeeController, {
        prefix: '/v1',
    })

    fastify.register(signInMethodController, {
        prefix: '/v1',
    })

    fastify.register(userController, {
        prefix: '/v1',
    })

    fastify.register(jwksController, {
        service: createJwksService(),
    });

    return fastify;
}
