import { FastifyPluginAsync } from 'fastify';
import { DeliveryTokenService } from './delivery-token.service';
import { DeliveryService } from './delivery.service';
import { WebSocket } from 'ws';

const deliverySubscriptions = new Map<number, Set<WebSocket>>();

interface TrackingMessage {
  type: 'location_update' | 'status_update' | 'error' | 'connection_confirmed';
  payload?: any;
  timestamp: string;
}

function addDeliverySubscription(deliveryId: number, socket: WebSocket) {
  if (!deliverySubscriptions.has(deliveryId)) {
    deliverySubscriptions.set(deliveryId, new Set());
  }
  deliverySubscriptions.get(deliveryId)!.add(socket);
}

function removeDeliverySubscription(deliveryId: number, socket: WebSocket) {
  if (deliverySubscriptions.has(deliveryId)) {
    deliverySubscriptions.get(deliveryId)!.delete(socket);
    if (deliverySubscriptions.get(deliveryId)!.size === 0) {
      deliverySubscriptions.delete(deliveryId);
    }
  }
}

export function broadcastLocationUpdate(deliveryId: number, locationData: any) {
  const message: TrackingMessage = {
    type: 'location_update',
    payload: locationData,
    timestamp: new Date().toISOString()
  };

  const payload = JSON.stringify(message);
  deliverySubscriptions.get(deliveryId)?.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      console.log(`Sending location update to subscriber for delivery #${deliveryId}`);
      client.send(payload);
    } else {
      console.log(`Client for delivery #${deliveryId} not in OPEN state (state: ${client.readyState})`);
    }
  });
}

export const trackingWebsocketPlugin: (
  deliveryTokenService: DeliveryTokenService,
  deliveryService: DeliveryService
) => FastifyPluginAsync = (deliveryTokenService, deliveryService) => async (fastify) => {

  fastify.get<{ Querystring: { token: string } }>(
    '/ws/tracking',
    {
      websocket: true,
      schema: {
        querystring: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' }
          }
        }
      }
    },
    async (connection, req) => {
      const socket = connection;
      const token = req.query.token;

      const decodedToken = deliveryTokenService.verifyToken(token);

      if (!decodedToken) {
        socket.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid tracking token' },
          timestamp: new Date().toISOString()
        }));
        socket.close();
        return;
      }

      const deliveryId = decodedToken.delivery_id;

      try {
        const delivery = await deliveryService.getDeliveryById(deliveryId);

        if (!delivery) {
          socket.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Delivery not found' },
            timestamp: new Date().toISOString()
          }));
          socket.close();
          return;
        }

        const partnerCoordinates = await deliveryService.getPartnerCoordinatesByDeliveryId(deliveryId);

        addDeliverySubscription(deliveryId, socket);

        socket.send(JSON.stringify({
          type: 'connection_confirmed',
          payload: {
            delivery_id: deliveryId,
            status: delivery.status,
            partner: partnerCoordinates ? {
              latitude: partnerCoordinates.latitude,
              longitude: partnerCoordinates.longitude,
              logo: partnerCoordinates.logo_url,
            } : null
          },
          timestamp: new Date().toISOString()
        }));

        socket.on('close', () => {
          removeDeliverySubscription(deliveryId, socket);
        });

      } catch (error) {
        console.error('Error in tracking websocket:', error);
        socket.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Failed to set up tracking' },
          timestamp: new Date().toISOString()
        }));
        socket.close();
      }
    }
  );
};