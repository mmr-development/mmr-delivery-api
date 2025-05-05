import { FastifyPluginAsync } from 'fastify';

export interface EmployeesControllerOptions {

}

export const employeeController: FastifyPluginAsync<EmployeesControllerOptions> = async function (server) {
    server.post('/courier-applications/', { schema: { tags: ['Courier Applications'] } }, async (request, reply) => {

    });

    server.get('/courier-applications/', { schema: { tags: ['Courier Applications'] } }, async (request, reply) => {

    });

    server.get('/courier-applications/:id/', { schema: { tags: ['Courier Applications'] } }, async (request, reply) => {

    });

    server.patch('/courier-applications/:id/', { schema: { tags: ['Courier Applications'] } }, async (request, reply) => {

    });

    server.delete('/courier-applications/:id/', { schema: { tags: ['Courier Applications'] } }, async (request, reply) => {

    });
}
