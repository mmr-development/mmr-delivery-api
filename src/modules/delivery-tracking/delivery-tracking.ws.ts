import { FastifyPluginAsync } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { DeliveryTrackingService } from './delivery-tracking.service';

interface LocationUpdate {
  order_id: number;
  courier_id: string;
  latitude: number;
  longitude: number;
  action: 'update_location' | 'subscribe';
}

const orderConnections = new Map<number, Set<any>>();

export const deliveryTrackingWsPlugin: (service: DeliveryTrackingService) => FastifyPluginAsync = (service) => async (fastify) => {
  await fastify.register(fastifyWebsocket);

  fastify.get('/ws/delivery-tracking', { websocket: true }, (connection, req) => {
    let subscribedOrderId: number | null = null;

    connection.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as LocationUpdate;

        if (msg.action === 'subscribe') {
          subscribedOrderId = msg.order_id;
          if (!orderConnections.has(subscribedOrderId)) orderConnections.set(subscribedOrderId, new Set());
          orderConnections.get(subscribedOrderId)!.add(connection);

          // Optionally send latest location
          const latest = await service.getLatestLocation(subscribedOrderId);
          if (latest) {
            connection.send(JSON.stringify({ type: 'location', ...latest }));
          }
        }

        if (msg.action === 'update_location') {
          // Save to DB
          await service.saveLocation({
            order_id: msg.order_id,
            courier_id: msg.courier_id,
            // latitude: msg.latitude,
            // longitude: msg.longitude,
          });

          // Broadcast to all subscribers
          const payload = JSON.stringify({
            type: 'location',
            order_id: msg.order_id,
            courier_id: msg.courier_id,
            latitude: msg.latitude,
            longitude: msg.longitude,
            timestamp: new Date().toISOString(),
          });
          orderConnections.get(msg.order_id)?.forEach(client => {
            if (client !== connection && client.socket.readyState === 1) {
              client.socket.send(payload);
            }
          });
        }
      } catch (err) {
        connection.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
      }
    });

    connection.on('close', () => {
      if (subscribedOrderId && orderConnections.has(subscribedOrderId)) {
        orderConnections.get(subscribedOrderId)!.delete(connection);
        if (orderConnections.get(subscribedOrderId)!.size === 0) orderConnections.delete(subscribedOrderId);
      }
    });
  });
};