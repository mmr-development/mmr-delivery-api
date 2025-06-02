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
import { partnerApplicationController } from './modules/partner/partner-application';
import { partnerController } from './modules/partner';
import { employeeController } from './modules/employees';
import { createEmailService } from './modules/email';
import { createPartnerApplicationService, createPartnerApplicationRepository } from './modules/partner/partner-application';
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
import { catalogController } from './modules/partner/catalog/catalog-controller';
import multipart from '@fastify/multipart';
import { createOrderService } from './modules/orders/order.service';
import { createOrdersRepository } from './modules/orders/order.repository';
import { createCustomerRepository, createCustomerService } from './modules/customer';
import { createPaymentService, createPaymentRepository } from './modules/payment';
import path from 'path';
import { createCourierScheduleService } from './modules/employees/courier-schedule/courier-schedule.service';
import { createCourierScheduleRepository } from './modules/employees/courier-schedule/courier-schedule.repository';
import { courierScheduleController } from './modules/employees/courier-schedule/courier-schedule.controller';
import { orderWebsocketPlugin } from './modules/orders/order.ws';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { recommendationController } from './modules/recommendations/recommendation.controller';
import { createRecommendationService } from './modules/recommendations/recommendation.service';
import {
    createDeliveryService,
    deliveryController,
    deliveryWebsocketPlugin,
    createDeliveryRepository
} from './modules/delivery';
import { deliveryTaskPlugin } from './modules/delivery/delivery.task';
import {
    createTimeEntryRepository,
    createTimeEntryService,
    timeEntryController
} from './modules/time-entry';
import { courierController, createCourierService, createCourierRepository } from './modules/employees/couriers';
import { createRoleRepository, createRoleService, roleController } from './modules/role';
import { partnerWebsocketPlugin } from './modules/partner/partner.ws';
import { createCourierConnectionManager } from './modules/delivery/courier-connection-manager';
import { createPushNotificationService } from './modules/push-notifications/push-notification.service';
import { createPushNotificationRepository } from './modules/push-notifications/push-notification.repository';
import { createDeliveryTokenService } from './modules/delivery/delivery-token.service';
import { trackingWebsocketPlugin } from './modules/delivery/tracking.ws';


export interface AppOptions {
    config: typeof config;
};

export async function buildApp(fastify: FastifyInstance, opts: AppOptions) {
    const config = opts.config;

    fastify.register(fastifyWebsocket);

    fastify.register(fastifyStatic, {
        root: path.join(__dirname, '..', 'public'),
        prefix: '/public/',
        maxAge: '7d'
    })

    const pool = new Pool({
        ...config.database,
        max: 20,
    });

    const db = new Kysely<Database>({
        dialect: new PostgresDialect({
            pool: async () => pool,
        }),
        // log: ['query']
    });

    fastify.register(cors, {
        origin: [
            'https://10.130.54.32:5501',
            'https://localhost:5501',
            'http://localhost:5501',
            'http://172.19.16.1:5501',
            'https://172.19.16.1:5501',
            'http://localhost:5501',
            'http://127.0.0.1:5501',
            'https://10.130.54.22:5501',
            'http://10.130.54.44:8082',
            'http://10.130.54.44:8081',
            'https://172.30.80.1:5501',
            'https://172.22.240.1:5501',
            'https://127.0.0.1:5501',
            'https://10.130.54.44:8081',
            'http://10.130.54.44:8081',
            'https://mmr-development.dk'
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    });

    fastify.register(fastifyCookie, {
        secret: config.cookie.secret,
    })

    fastify.register(multipart, {
        limits: {
            fileSize: 500 * 1024 * 1024,
        }
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
            createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db))),
            createSignInMethodRepository(db)
        ),
        authenticationTokenService: createAuthenticationTokenService(createRefreshTokenRepository(db)),
        userService: createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db))),
        passwordResetService: createPasswordResetService(createPasswordResetTokenRepository(db), createEmailService(config)),
        prefix: '/v1',
    })

    fastify.register(partnerController, {
        deliveryMethodService: createDeliveryMethodService(db),
        businessTypeService: createBusinessTypeService(db),
        partnerService: createPartnerService(db, createAddressService(createAddressRepository(db))),
        partnerHourService: createPartnerHourService(createPartnerHourRepository(db)),
        catalogService: createCatalogService(db),
        prefix: '/v1'
    })

    fastify.register(partnerApplicationController, {
        partnerApplicationService: createPartnerApplicationService(
            createPartnerApplicationRepository(db),
            createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db))),
            createAddressService(createAddressRepository(db)),
            createEmailService(config),
            createUserRoleService(createUserRoleRepository(db)),
            createPasswordResetService(createPasswordResetTokenRepository(db), createEmailService(config)),
        ),
        prefix: '/v1'
    });

    fastify.register(catalogController, {
        catalogService: createCatalogService(db),
        prefix: '/v1',
    })

    fastify.register(employeeController, {
            courierApplicationService: createCourierApplicationService(
                createCourierApplicationRepository(db),
                createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db))),
                createAddressService(createAddressRepository(db)),
                createEmailService(config),
                createPasswordResetService(createPasswordResetTokenRepository(db), createEmailService(config)),
                createUserRoleService(createUserRoleRepository(db))
            ),
            vehicleTypeService: createVehicleTypeService(db),
            hourPreferenceService: createHourPreferenceService(createHourPreferenceRepository(db)),
            schedulePreferenceService: createSchedulePreferenceService(createSchedulePreferenceRepository(db)),
            prefix: '/v1',
        })

    const chatRepository = createChatRepository(db);
    const chatService = createChatService(chatRepository, createUserRoleService(createUserRoleRepository(db)));

    fastify.register(chatWsPlugin(chatService))

    fastify.register(chatController, {
        chatService: chatService,
        prefix: '/v1',
    })

    fastify.register(recommendationController, {
        recommendationService: createRecommendationService(
            createOrdersRepository(db),
            createCatalogService(db)
        ),
        prefix: '/v1',
    })


    fastify.register(signInMethodController, {
        prefix: '/v1',
    })

    fastify.register(userController, {
        userService: createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db))),
        prefix: '/v1',
    })

    fastify.register(jwksController, {
        service: createJwksService(),
    });

    const deliveryRepository = createDeliveryRepository(db);
    const timeEntryRepository = createTimeEntryRepository(db);
    const ordersRepository = createOrdersRepository(db);
    const deliveryService = createDeliveryService(deliveryRepository, ordersRepository, createCourierConnectionManager(), createEmailService(config), createDeliveryTokenService());
    const timeEntryService = createTimeEntryService(timeEntryRepository);

    fastify.register(deliveryWebsocketPlugin(deliveryService));

    fastify.register(deliveryController, {
        deliveryService,
        prefix: '/v1',
    });

    fastify.register(timeEntryController, {
        timeEntryService,
        prefix: '/v1',
    });

    fastify.register(deliveryTaskPlugin(deliveryService, createCourierConnectionManager()));

    fastify.register(orderController, {
        orderService: createOrderService(
            createOrdersRepository(db),
            createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db))),
            createAddressService(createAddressRepository(db)),
            createCustomerService(createCustomerRepository(db)),
            createPaymentService(createPaymentRepository(db)),
            createCatalogService(db),
            createPartnerService(db, createAddressService(createAddressRepository(db))),
            createPushNotificationService(createPushNotificationRepository(db)),
            deliveryService,
        ),
        deliveryService,
        customerService: createCustomerService(createCustomerRepository(db)),
        pushNotificationService: createPushNotificationService(createPushNotificationRepository(db)),
        deliveryTokenService: createDeliveryTokenService(),
        emailService: createEmailService(config),
        prefix: '/v1',
    })

    fastify.register(courierController, {
        courierService: createCourierService(createCourierRepository(db)),
        prefix: '/v1',
    })

    fastify.register(courierScheduleController, {
        courierScheduleService: createCourierScheduleService(createCourierScheduleRepository(db), createCourierService(createCourierRepository(db))),
        prefix: '/v1',
    })

    fastify.register(roleController, {
        roleService: createRoleService(createRoleRepository(db)),
        prefix: '/v1',
    })

    fastify.register(
        partnerWebsocketPlugin(
            createOrderService(
                createOrdersRepository(db),
                createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db))),
                createAddressService(createAddressRepository(db)),
                createCustomerService(createCustomerRepository(db)),
                createPaymentService(createPaymentRepository(db)),
                createCatalogService(db),
                createPartnerService(db, createAddressService(createAddressRepository(db))),
            )
        )
    )

    fastify.register(trackingWebsocketPlugin(
        createDeliveryTokenService(),
        deliveryService
    ));

const orderServiceForWs = createOrderService(
    createOrdersRepository(db),
    createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db)), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db))),
    createAddressService(createAddressRepository(db)),
    createCustomerService(createCustomerRepository(db)),
    createPaymentService(createPaymentRepository(db)),
    createCatalogService(db),
    createPartnerService(db, createAddressService(createAddressRepository(db))),
    createPushNotificationService(createPushNotificationRepository(db)),
);

fastify.register(orderWebsocketPlugin(orderServiceForWs, deliveryService));
    return fastify;
}
