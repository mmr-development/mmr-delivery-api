import { FastifyPluginAsync } from 'fastify';
import { DeliveryService } from './delivery.service';
import { DeliveryMessage } from './delivery.types';
import { broadcastLocationUpdate } from './tracking.ws';

export const deliveryWebsocketPlugin: (deliveryService: DeliveryService) => FastifyPluginAsync =
  (deliveryService) => async (fastify) => {
    fastify.get('/ws/courier/delivery', {
      websocket: true,
      preHandler: [fastify.authenticate, fastify.guard.role('courier')]
    }, (connection, request) => {
      const socket = connection;
      let courierId: string | null = null;

      if (request.user && request.user.sub) {
        courierId = request.user.sub;
        fastify.log.info(`Courier authenticated via JWT: ${courierId}`);
        completeAuthentication();
        return;
      }

      async function completeAuthentication() {
        deliveryService.registerCourierConnection(courierId, socket);

        const message: DeliveryMessage = {
          type: 'connection_confirmed',
          payload: {
            connected: true,
            courier_id: courierId,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };
        socket.send(JSON.stringify(message));

        try {
          const { deliveries } = await deliveryService.getActiveCourierDeliveries(courierId);

          fastify.log.info(`Courier ${courierId} connected: sending ${deliveries.length} active deliveries`);

          socket.send(JSON.stringify({
            type: 'current_deliveries',
            payload: {
              success: true,
              deliveries
            },
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
        }

        socket.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
              case 'status_update':

                if (message.delivery_id && message.status) {
                  try {
                    const updatedDelivery = await deliveryService.updateDeliveryStatus(
                      message.delivery_id,
                      message.status,
                      courierId
                    );

                    const activeDeliveries = await deliveryService.getActiveCourierDeliveries(courierId);
                    console.log(activeDeliveries);

                    socket.send(JSON.stringify({
                      type: 'status_update',
                      payload: {
                        success: true,
                        delivery_id: updatedDelivery.id,
                        status: updatedDelivery.status,
                        deliveries: activeDeliveries.deliveries
                      },
                      timestamp: new Date().toISOString()
                    }));
                  } catch (error) {
                    socket.send(JSON.stringify({
                      type: 'error',
                      payload: { message: error.message },
                      timestamp: new Date().toISOString()
                    }));
                  }
                }
                break;

              case 'location_update':
                // Update courier location
                if (message.latitude && message.longitude) {
                  // await deliveryService.updateCourierLocation(
                  //   courierId,
                  //   message.latitude,
                  //   message.longitude
                  // );

                    const activeDeliveries = await deliveryService.getActiveCourierDeliveries(courierId);
                        console.log(`Courier ${courierId} has ${activeDeliveries.deliveries.length} active deliveries`);

                    for (const delivery of activeDeliveries.deliveries) {
                      broadcastLocationUpdate(delivery.id, {
                        delivery_id: delivery.id,
                        order_id: delivery.order_id,
                        latitude: message.latitude,
                        longitude: message.longitude,
                        status: delivery.status,
                        timestamp: new Date().toISOString()
                      });
                    }

                  socket.send(JSON.stringify({
                    type: 'location_update',
                    payload: { success: true },
                    timestamp: new Date().toISOString()
                  }));
                }
                break;

              case 'heartbeat':
                socket.send(JSON.stringify({
                  type: 'heartbeat_ack',
                  timestamp: new Date().toISOString()
                }));
                break;

              case 'sync_deliveries':
                fastify.log.info(`Courier ${courierId} requested delivery sync`);
                const { deliveries } = await deliveryService.getActiveCourierDeliveries(courierId);
                socket.send(JSON.stringify({
                  type: 'current_deliveries',
                  payload: {
                    success: true,
                    deliveries
                  },
                  timestamp: new Date().toISOString()
                }));
                break;
            }
          } catch (error) {
            fastify.log.error('Error processing WebSocket message:', error);
            socket.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Error processing message' },
              timestamp: new Date().toISOString()
            }));
          }
        });

        socket.on('close', () => {
          deliveryService.handleCourierDisconnection(courierId);
        });
      }
    });
  };
