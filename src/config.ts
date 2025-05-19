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
        readonly accessTokenExpiration: string;
        readonly refreshTokenExpiration: string;
    };
    readonly cookie: {
        readonly name: string;
        readonly secret: string;
        readonly sameSite: string;
        readonly secure: boolean;
        readonly httpOnly: boolean;
        readonly refreshTokenMaxAge: number;  // Added separate value for refresh tokens
        readonly accessTokenMaxAge: number;   // Added separate value for access tokens
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
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'Oq91b4Oa5mQF',
    },
    jwt: {
        algorithm: process.env.JWT_ALGORITHM || 'RS256',
        accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
        refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
    },
    cookie: {
        name: process.env.COOKIE_NAME || 'mmr_delivery',
        secret: process.env.COOKIE_SECRET || 'mmr_delivery',
        sameSite: process.env.COOKIE_SAME_SITE || 'none',
        secure: process.env.COOKIE_SECURE === 'true',
        httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
        refreshTokenMaxAge: parseInt(process.env.COOKIE_REFRESH_TOKEN_MAX_AGE || '604800'), // 7 days in seconds
        accessTokenMaxAge: parseInt(process.env.COOKIE_ACCESS_TOKEN_MAX_AGE || '900'),      // 15 minutes in seconds
    },
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '465'),
        secure: process.env.EMAIL_SECURE === 'false',
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        from: process.env.EMAIL_FROM || 'MMR Delivery',
    },
    appUrl: process.env.APP_URL || 'http://localhost:8080',
}
