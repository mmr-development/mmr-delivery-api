import Fastify from 'fastify';
import { buildApp } from './app';
import { config } from './config';
import closeWithGrace from 'close-with-grace';

async function main(customConfig = config) {
    const config = customConfig;

    const server = Fastify({
        logger: {
            transport: {
                target: 'pino-pretty',
            },
        },
        trustProxy: true,
    });

    server.register(buildApp, { config });

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
