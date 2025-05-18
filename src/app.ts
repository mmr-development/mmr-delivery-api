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
import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { createCourierScheduleService } from './modules/employees/courier-schedule/courier-schedule.service';
import { createCourierScheduleRepository } from './modules/employees/courier-schedule/courier-schedule.repository';
import { courierScheduleController } from './modules/employees/courier-schedule/courier-schedule.controller';
import { orderWebsocketPlugin } from './modules/orders/order.ws';
import fastifyStatic from '@fastify/static';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import fastifyWebsocket from '@fastify/websocket';
import { recommendationController} from './modules/recommendations/recommendation.controller';
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


export interface AppOptions {
    config: typeof config;
};

export async function buildApp(fastify: FastifyInstance, opts: AppOptions) {
    const config = opts.config;

    const serviceAccountPath = path.join(__dirname, '..', 'mmr-delivery-firebase-adminsdk-fbsvc-f295b1b259.json');
    const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf8')
    );

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    })

    fastify.withTypeProvider<TypeBoxTypeProvider>();

    fastify.register(fastifyWebsocket);

    fastify.register(fastifyStatic, {
        root: path.join(__dirname, '..', 'public'),
        prefix: '/public/',
    })

    // Create the pool with monitoring capability
    const pool = new Pool({
        ...config.database,
        max: 20,  // Increase max connections
        idleTimeoutMillis: 30000  // Close idle connections after 30s
    });
    
    // Add pool monitoring
    pool.on('connect', () => {
        console.log(`[DB-POOL] New connection created. Stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    });
    
    pool.on('remove', () => {
        console.log(`[DB-POOL] Connection removed. Stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    });
    
    // Set up interval for logging pool statistics
    const poolMonitorInterval = setInterval(() => {
        console.log(`[DB-POOL] Stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    }, 30000); // Log every 30 seconds
    
    // Clean up on process exit
    process.on('SIGINT', () => {
        clearInterval(poolMonitorInterval);
        console.log('[DB-POOL] Shutting down pool monitor');
        pool.end();
    });
    
    // Create Kysely instance using our monitored pool
    const db = new Kysely<Database>({
        dialect: new PostgresDialect({
            pool: async () => pool,
        }),
        log: ['query']
    });
    
    // Simple debug endpoint for checking pool status (disable in production)
    if (process.env.NODE_ENV !== 'production') {
        fastify.get('/debug/pool-status', (req, reply) => {
            return {
                timestamp: new Date().toISOString(),
                pool: {
                    totalConnections: pool.totalCount,
                    idleConnections: pool.idleCount,
                    waitingClients: pool.waitingCount
                }
            };
        });
    }

    fastify.register(cors, {
        origin: [
            'https://10.130.54.32:5501',
            'https://localhost:5501',
            'http://172.19.16.1:5501',
            'https://172.19.16.1:5501',
            'http://localhost:5501',
            'http://127.0.0.1:5500',
            'https://10.130.54.22:5501',
            'http://10.130.54.44:8082',
            'http://10.130.54.44:8081',
            'https://172.30.80.1:5501',
            'https://172.22.240.1:5501',
            'http://127.0.0.1:5501',
            'https://127.0.0.1:5501',
            'https://10.130.54.44:8081',
            'http://10.130.54.44:8081',
            'https://8ce3-77-214-126-101.ngrok-free.app'
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    });

    fastify.register(fastifyCookie, {
        secret: "my-secret",
    })

    fastify.register(multipart);

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
        deliveryMethodService: createDeliveryMethodService(db),
        businessTypeService: createBusinessTypeService(db),
        partnerService: createPartnerService(db),
        partnerHourService: createPartnerHourService(createPartnerHourRepository(db)),
        prefix: '/v1'
    })

    // Update the registration of partnerApplicationController with the correct dependencies
    fastify.register(partnerApplicationController, {
        partnerApplicationService: createPartnerApplicationService(
            createPartnerApplicationRepository(db),
            createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))),
            createAddressService(createAddressRepository(db)),
            createEmailService(config),
            createUserRoleService(createUserRoleRepository(db)),
            createPartnerService(db),
        ),
        prefix: '/v1/partner-applications'
    });

    fastify.register(catalogController, {
        catalogService: createCatalogService(db),
        prefix: '/v1',
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
        userService: createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))),
        prefix: '/v1',
    })

    fastify.register(jwksController, {
        service: createJwksService(),
    });

    // Create delivery service and register delivery components
    const deliveryRepository = createDeliveryRepository(db);
    const timeEntryRepository = createTimeEntryRepository(db);
    const ordersRepository = createOrdersRepository(db);
    const deliveryService = createDeliveryService(deliveryRepository, ordersRepository);
    const timeEntryService = createTimeEntryService(timeEntryRepository);

    // Register the delivery websocket handler
    fastify.register(deliveryWebsocketPlugin(deliveryService));
    
    // Register the delivery controller (without timeEntryService)
    fastify.register(deliveryController, {
        deliveryService,
        prefix: '/v1',
    });
    
    // Register the time entry controller separately
    fastify.register(timeEntryController, {
        timeEntryService,
        prefix: '/v1',
    });
    
    // Register the delivery task for periodic checking
    fastify.register(deliveryTaskPlugin(deliveryService));

    // Update order service and controller to include delivery service
    fastify.register(orderController, {
        orderService: createOrderService(
            createOrdersRepository(db), 
            createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))), 
            createAddressService(createAddressRepository(db)), 
            createCustomerService(createCustomerRepository(db)), 
            createPaymentService(createPaymentRepository(db)), 
            createCatalogService(db), 
            createPartnerService(db),
            deliveryService // Add deliveryService to orderService
        ),
        deliveryService, // Add deliveryService to controller
        prefix: '/v1',
    })

    fastify.register(courierScheduleController, {
        courierScheduleService: createCourierScheduleService(createCourierScheduleRepository(db)),
        prefix: '/v1',
    })

    fastify.register(orderWebsocketPlugin(createOrderService(createOrdersRepository(db), createUserService(createUserRepository(db), createUserRoleService(createUserRoleRepository(db))), createAddressService(createAddressRepository(db)), createCustomerService(createCustomerRepository(db)), createPaymentService(createPaymentRepository(db)), createCatalogService(db), createPartnerService(db))));
    return fastify;
}
