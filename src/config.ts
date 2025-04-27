import { ConnectionConfig } from 'pg';

export interface Config {
    readonly port: number;
    readonly host: string;
    readonly redis: {
        readonly host: string;
        readonly port: number;
        readonly password?: string;
    };
    readonly jwt: {
        readonly algorithm: string;
        readonly accessTokenExpiration: number;
        readonly refreshTokenExpiration: number;
    };
    readonly database: ConnectionConfig;
}

export const config: Config = {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '3000'),
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mmr_delivery_test',
    },
    redis: {
        host: process.env.REDIS_HOST || 'host.docker.internal',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    },
    jwt: {
        algorithm: process.env.JWT_ALGORITHM || 'RS256',
        accessTokenExpiration: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION || '3600'),
        refreshTokenExpiration: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION || '604800'),
    }
}
