import { ConnectionConfig } from 'pg';

export interface Config {
    readonly port: number;
    readonly host: string;
    readonly redis: {
        readonly host: string;
        readonly port: number;
        readonly password: string;
    };
    readonly jwt: {
        readonly algorithm: string;
        readonly accessTokenExpiration: number;
        readonly refreshTokenExpiration: number;
    };
    readonly database: ConnectionConfig;
    readonly email: {
        readonly host: string;
        readonly port: number;
        readonly secure: boolean;
        readonly user: string;
        readonly password: string;
        readonly from: string;
    };
    readonly appUrl: string;
}

export const config: Config = {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '8080'),
    database: {
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mmr_delivery_test',
    },
    redis: {
        host: process.env.REDIS_HOST || '172.17.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'Oq91b4Oa5mQF',
    },
    jwt: {
        algorithm: process.env.JWT_ALGORITHM || 'RS256',
        accessTokenExpiration: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION || '3600'),
        refreshTokenExpiration: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION || '604800'),
    },
    email: {
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER || 'user@example.com',
        password: process.env.EMAIL_PASSWORD || 'password',
        from: process.env.EMAIL_FROM || 'MMR Delivery <no-reply@mmrdelivery.com>',
    },
    appUrl: process.env.APP_URL || 'http://localhost:8080',
}
