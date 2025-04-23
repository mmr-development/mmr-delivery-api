import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './types/kysely.types';
import config from './config';

function createDatabaseConnection(databaseConfig: {
    database: string;
    host: string;
    user: string;
    password: string;
    port: number;
}) {
    const dialect = new PostgresDialect({
        pool: new Pool({
            database: databaseConfig.database,
            host: databaseConfig.host,
            user: databaseConfig.user,
            password: databaseConfig.password,
            port: databaseConfig.port,
            max: 10,
        }),
    });

    return new Kysely<Database>({
        dialect,
        log: ['query'],
    });
}

// For production usage:
export const db = createDatabaseConnection({
    database: config.database.database || 'just_authentication_test',
    host: config.database.host,
    user: config.database.user || 'postgres',
    password: config.database.password || 'admin123',
    port: config.database.port,
});