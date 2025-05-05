import fp from 'fastify-plugin';
import fastifySwaggerUI from '@fastify/swagger-ui';
import fastifySwagger from '@fastify/swagger';

export default fp(async function (server) {
    if (process.env.NODE_ENV !== 'production') {
        /*
        * Fastify plugin for serving Swagger.
        *
        * @see {@link https://github.com/fastify/fastify-swagger}
        */
        await server.register(fastifySwagger, {
            hideUntagged: true,
            openapi: {
                info: {
                    title: 'MMR Delivery API',
                    version: '1.0.0',
                },
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                        },
                    },
                },
            }
        });

        /*
        * Fastify plugin for serving Swagger UI.
        *
        * @see {@link https://github.com/fastify/fastify-swagger-ui}
        */
        await server.register(fastifySwaggerUI, {

        });
    }
});
