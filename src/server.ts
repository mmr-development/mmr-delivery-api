import Fastify from 'fastify';
import { buildApp } from './app';
import { config } from './config';
import closeWithGrace from 'close-with-grace';
import { db } from './db';
import { FileMigrationProvider, Migrator } from 'kysely';
import { promises as fs } from 'fs';
import path from 'path';

async function main(customConfig = config) {
    const config = customConfig;

    const server = Fastify({
        logger: {
            transport: {
                target: 'pino-pretty',
            },
        },
    });

    server.register(buildApp, { config });

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder: path.join(__dirname, '../migrations'),
        }),
    })

    await migrator.migrateToLatest()

    try {
        await server.listen({ port: config.port, host: config.host });

        closeWithGrace(async ({ err: error }) => {
            if (error) {
                server.log.error({ error }, 'Server closing with error.');
            }
            server.log.info('Server shutting down gracefully.');
            await server.close();
        });
    } catch (error) {
        server.log.error(error);
        process.exit(1);
    }
}

main();
