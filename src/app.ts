import { join } from 'path';
import { FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { authenticationController, createAuthenticationTokenService, createRefreshTokenRepository, createPasswordResetService, createPasswordResetTokenRepository } from './modules/authentication';
import { createSignInMethodService, createSignInMethodRepository, signInMethodController } from './modules/users/sign-in-method';
import { jwksController, createJwksService } from './modules/jwks';
import { userController, createUserService, createUserRepository } from './modules/users';
import { Database } from './database';
import { Kysely, PostgresDialect } from 'kysely';
import cors from '@fastify/cors';
import { Pool } from 'pg';
import { config } from './config';
import { partnerController } from './modules/partner';
import { employeeController } from './modules/employees';
import { createEmailService } from './modules/email';
import { createPartnerApplicationService, createPartnerApplicationRepository } from './modules/partner';
import { createDeliveryMethodService } from './modules/partner/delivery-method';
import { createBusinessTypeService } from './modules/partner/business-type';
import { createCatalogService } from './modules/partner/catalog';
import { createAddressRepository, createAddressService } from './modules/address';
import { createUserRoleService } from './modules/users/user-role/user-role.service';
import { createUserRoleRepository } from './modules/users/user-role/user-role.repository';
import fastifyCookie from '@fastify/cookie';
import { createPartnerService } from './modules/partner/partner.service';
import { createCourierApplicationService } from './modules/employees/courier-application/courier-application.service';
import { createCourierApplicationRepository } from './modules/employees/courier-application/courier-application.repository';
import { createVehicleTypeService } from './modules/employees/vehicle-types';
import { orderController } from './modules/orders';
import { createHourPreferenceService, createHourPreferenceRepository } from './modules/employees/hours-preference';
import { createSchedulePreferenceService, createSchedulePreferenceRepository } from './modules/employees/schedule-preference';
import { createPartnerHourService } from './modules/partner/partner-hour/partner-hour.service';
import { createPartnerHourRepository } from './modules/partner/partner-hour/partner-hour.repository';
import { chatWsPlugin } from './modules/chat/chat.ws';
import { createChatRepository } from './modules/chat/chat.repository';
import { createChatService } from './modules/chat/chat.service';
import { chatController } from './modules/chat/chat.controller';


export interface AppOptions {
    config: typeof config;
};

export async function buildApp(fastify: FastifyInstance, opts: AppOptions) {
    const config = opts.config;

    const db = new Kysely<Database>({
        dialect: new PostgresDialect({
            pool: async () => new Pool(config.database),
        }),
        log: ['query']
    });

    fastify.register(cors, {
        origin: [
            'https://10.130.54.32:5501',
            'https://localhost:5501',
            'http://127.0.0.1:5500',
            'https://127.0.0.1:5501',
            'https://10.130.54.44:8081',
            'http://10.130.54.44:8081'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    });

    fastify.register(fastifyCookie, {
        secret: "my-secret",
    })

    /* Loads all plugins defined in the plugins directory. */
    fastify.register(AutoLoad, {
        dir: join(__dirname, 'plugins'),
        dirNameRoutePrefix: false,
        options: { ...opts, db, config },
    });

    fastify.register(authenticationController, {
        signInMethodService: createSignInMethodService(
            createAuthenticationTokenService(createRefreshTokenRepository(db)),
            createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))),
            createSignInMethodRepository(db)
        ),
        authenticationTokenService: createAuthenticationTokenService(createRefreshTokenRepository(db)),
        userService: createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))),
        passwordResetService: createPasswordResetService(createPasswordResetTokenRepository(db), createEmailService(config)),
        prefix: '/v1',
    })

    fastify.register(partnerController, {
        partnerApplicationService: createPartnerApplicationService(createPartnerApplicationRepository(db), createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))), createAddressService(createAddressRepository(db))),
        deliveryMethodService: createDeliveryMethodService(db),
        businessTypeService: createBusinessTypeService(db),
        catalogService: createCatalogService(db),
        partnerService: createPartnerService(db), 
        partnerHourService: createPartnerHourService(createPartnerHourRepository(db)),
        prefix: '/v1'
    })

    fastify.register(employeeController, {
        courierApplicationService: createCourierApplicationService(createCourierApplicationRepository(db), createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))), createAddressService(createAddressRepository(db))),
        vehicleTypeService: createVehicleTypeService(db),
        hourPreferenceService: createHourPreferenceService(createHourPreferenceRepository(db)),
        schedulePreferenceService: createSchedulePreferenceService(createSchedulePreferenceRepository(db)),
        prefix: '/v1',
    })

    const chatRepository = createChatRepository(db);
    const chatService = createChatService(chatRepository);

    fastify.register(chatWsPlugin(chatService))

    fastify.register(chatController, {
        chatService: chatService,
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

    fastify.register(orderController, {
        prefix: '/v1',
    })

    return fastify;
}
