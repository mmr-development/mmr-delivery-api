import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { ControllerError } from '../utils/errors';

export const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof ControllerError) {
      return reply
        .status(error.status)
        .send(error.toJSON());
    }

    if (error.validation) {
      return reply
        .status(400)
        .send({
          error: {
            code: 'ValidationError',
            message: 'Validation error',
            errors: error.validation
          }
        });
    }

    if (error.statusCode) {
      return reply
        .status(error.statusCode)
        .send({
          statusCode: error.statusCode,
          error: error.code || error.name || 'Error',
          message: error.message || 'An error occurred'
        });
    }

    // Default error handler for unexpected errors
    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  });
};

export default fp(errorHandler);