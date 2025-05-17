import { FastifyPluginAsync } from 'fastify';
import { PartnerApplicationService } from './partner-application.service';
import { Type } from '@sinclair/typebox';

export interface PartnerApplicationControllerOptions {
  partnerApplicationService: PartnerApplicationService;
}

export const partnerApplicationController: FastifyPluginAsync<PartnerApplicationControllerOptions> = async function (
  fastify,
  options, 
) {
  const { partnerApplicationService } = options;

  // Submit application
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Partner Applications'],
        body: Type.Object({
          contact_person: Type.Object({
            first_name: Type.String(),
            last_name: Type.String(),
            email: Type.String({ format: 'email' }),
            phone_number: Type.String(),
          }),
          business: Type.Object({
            name: Type.String(),
            phone_number: Type.String(),
            image_url: Type.Optional(Type.String()),
            address: Type.Object({
              street: Type.String(),
              city: Type.String(),
              postal_code: Type.String(),
              country: Type.String(),
              address_detail: Type.Optional(Type.String()),
              latitude: Type.Optional(Type.Number()),
              longitude: Type.Optional(Type.Number()),
            }),
          }),
          delivery_method_id: Type.Number(),
          business_type_id: Type.Number(),
          delivery_fee: Type.Optional(Type.Number()),
          min_order_value: Type.Optional(Type.Number()),
          max_delivery_distance_km: Type.Optional(Type.Number()),
        }),
        response: {
          201: Type.Object({
            id: Type.Number(),
            status: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const application = await partnerApplicationService.submitApplication(request.body);
      return reply.status(201).send({
        id: application.id,
        status: application.status,
      });
    }
  );

  // Get all applications
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Partner Applications'],
        security: [{ bearerAuth: [] }],
        querystring: Type.Object({
          offset: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          status: Type.Optional(Type.String()),
        }),
      },
      preHandler: [fastify.authenticate, fastify.guard.role('admin')],
    },
    async (request, reply) => {
      const { offset, limit, status } = request.query as any;
      const result = await partnerApplicationService.getAllPartnerApplications({
        offset,
        limit,
        filters: { status },
      });
      return result;
    }
  );

  // Get application by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Partner Applications'],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.Number(),
        }),
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const application = await partnerApplicationService.getPartnerApplicationById(id);
      
      if (!application) {
        return reply.status(404).send({ message: 'Application not found' });
      }
      
      return application;
    }
  );

  // Update application
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Partner Applications'],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.Number(),
        }),
        body: Type.Object({
          status: Type.Optional(Type.String()),
          business: Type.Optional(Type.Object({
            name: Type.Optional(Type.String()),
            phone_number: Type.Optional(Type.String()),
          })),
          delivery_method_id: Type.Optional(Type.Number()),
          business_type_id: Type.Optional(Type.Number()),
          rejection_reason: Type.Optional(Type.String()),
        }),
      },
      preHandler: [fastify.authenticate, fastify.guard.role('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const application = await partnerApplicationService.updateApplication(id, request.body as any);
      return application;
    }
  );

  // Delete application
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Partner Applications'],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.Number(),
        }),
      },
      preHandler: [fastify.authenticate, fastify.guard.role('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      await partnerApplicationService.deleteApplication(id);
      return reply.status(204).send();
    }
  );

  // Activate partner account
  fastify.post(
    '/activate',
    {
      schema: {
        tags: ['Partner Applications'],
        querystring: Type.Object({
          token: Type.String(),
        }),
        body: Type.Object({
          password: Type.String({ minLength: 8 }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { token } = request.query as { token: string };
      const { password } = request.body as { password: string };
      
      const result = await partnerApplicationService.activatePartner(token, password);
      return result;
    }
  );
};
