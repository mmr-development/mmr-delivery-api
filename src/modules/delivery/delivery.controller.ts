import { FastifyPluginAsync } from 'fastify';
import { DeliveryService } from './delivery.service';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { courierDeliveriesSchema } from './schemas';

export interface DeliveryControllerOptions {
  deliveryService: DeliveryService;
}

export const deliveryController: FastifyPluginAsync<DeliveryControllerOptions> = async function (server, { deliveryService }) {
  const typedServer = server.withTypeProvider<TypeBoxTypeProvider>();
  typedServer.get('/couriers/deliveries/', { schema: courierDeliveriesSchema, preHandler: [server.authenticate, server.guard.role('courier')] }, async (request, reply) => {
    const courierId = request.user.sub;
    try {
      const deliveries = await deliveryService.getActiveCourierDeliveries(courierId);
      console.log('Deliveries:', deliveries);
      reply.status(200).send(deliveries);
    } catch (error) {
      return reply.status(500).send({
        deliveries: [],
      });
    }
  });

    typedServer.post<{ Params: { delivery_id: number }}>('/deliveries/:delivery_id/documentation/', {
    preHandler: [server.authenticate, server.guard.role('courier')]
  }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({ message: 'No file uploaded' });
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          message: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.'
        });
      }

      const documentUrl = await deliveryService.uploadProofOfDeliveryImage(
        request.params.delivery_id,
        data.filename,
        await data.toBuffer()
      );
      
      return reply.code(201).send({
        message: 'Documentation uploaded successfully',
        document_url: documentUrl
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Failed to upload documentation' });
    }
  });
};
