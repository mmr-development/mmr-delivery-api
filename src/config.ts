import { ConnectionConfig } from 'pg';

export interface Config {
    readonly port: number;
    readonly accessTokenExpiryDuration: string;
    readonly database: ConnectionConfig;
}

export default {
    host: process.env.HOST,
    port: parseInt(process.env.PORT || '3000'),
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    },
    jwt: {
        algorithm: process.env.JWT_ALGORITHM || 'RS256',
        accessTokenExpiration: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION || '3600'),
        refreshTokenExpiration: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION || '604800'),
    }
}
