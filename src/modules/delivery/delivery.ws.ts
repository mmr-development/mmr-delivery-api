import { FastifyPluginAsync } from 'fastify';
import { DeliveryService } from './delivery.service';
import { DeliveryMessage } from './delivery.types';

export const deliveryWebsocketPlugin: (deliveryService: DeliveryService) => FastifyPluginAsync =
  (deliveryService) => async (fastify) => {
    // WebSocket endpoint for couriers to connect
    fastify.get('/ws/courier/delivery', { 
      websocket: true,
      preHandler: [fastify.authenticate] // Use Fastify's JWT authentication
    }, (connection, request) => {
      // In Fastify WebSocket, connection is the WebSocket object
      const socket = connection;
      let authenticated = false;
      let courierId = null;

      // First try to get user from request.user (from JWT authentication)
      if (request.user && request.user.sub) {
        authenticated = true;
        courierId = request.user.sub;
        fastify.log.info(`Courier authenticated via JWT: ${courierId}`);
        completeAuthentication();
        return;
      } 
      
      // If not found in user.sub, try user.id
      if (request.user && request.user.id) {
        authenticated = true;
        courierId = request.user.id;
        fastify.log.info(`Courier authenticated via JWT id: ${courierId}`);
        completeAuthentication();
        return;
      }

      // Fallback to manual authentication methods
      try {
        // Try to authenticate from the Authorization header
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = fastify.jwt.verify(token);
            if (decoded && (decoded.sub || decoded.id)) {
              authenticated = true;
              courierId = decoded.sub || decoded.id;
              fastify.log.info(`Courier authenticated via header token: ${courierId}`);
              completeAuthentication();
              return;
            }
          } catch (err) {
            fastify.log.warn('Invalid token in Authorization header');
          }
        }
      } catch (error) {
        fastify.log.error('Error processing authentication header', error);
      }
      
      // If still not authenticated, wait for a token message
      if (!authenticated) {
        fastify.log.info('Waiting for authentication message');
        
        const authTimeout = setTimeout(() => {
          if (!authenticated) {
            socket.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Authentication timeout - please send token' },
              timestamp: new Date().toISOString()
            }));
            socket.close();
          }
        }, 10000); // 10 second timeout for authentication
        
        // Handle the first message as potential authentication
        const handleAuth = (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'authorization' && message.token) {
              clearTimeout(authTimeout);
              
              try {
                const decoded = fastify.jwt.verify(message.token);
                if (decoded && (decoded.sub || decoded.id)) {
                  authenticated = true;
                  courierId = decoded.sub || decoded.id;
                  
                  // Remove this auth handler
                  socket.removeListener('message', handleAuth);
                  
                  // Complete authentication
                  fastify.log.info(`Courier authenticated via message token: ${courierId}`);
                  completeAuthentication();
                } else {
                  throw new Error('Invalid token payload');
                }
              } catch (err) {
                socket.send(JSON.stringify({
                  type: 'error',
                  payload: { message: 'Invalid token' },
                  timestamp: new Date().toISOString()
                }));
                socket.close();
              }
            }
          } catch (err) {
            fastify.log.error('Error processing auth message', err);
          }
        };
        
        // Listen for auth message
        socket.on('message', handleAuth);
      }
      
      // Complete the authentication and set up regular message handlers
      async function completeAuthentication() {
        // Register courier connection
        deliveryService.registerCourierConnection(courierId, socket);
        
        // Send initial connection confirmation
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
        
        // Immediately send current active deliveries to the courier
        try {
          const activeDeliveries = await deliveryService.getActiveCourierDeliveries(courierId);
          
          fastify.log.info(`Courier ${courierId} connected: sending ${activeDeliveries.length} active deliveries`);
          
          // Always send the deliveries array, even if empty
          const formattedDeliveries = activeDeliveries.map(d => ({
            id: d.id,
            order_id: d.order_id,
            status: d.status,
            assigned_at: d.assigned_at.toISOString(),
            picked_up_at: d.picked_up_at?.toISOString(),
            delivered_at: d.delivered_at?.toISOString(),
            estimated_delivery_time: d.estimated_delivery_time?.toISOString()
          }));
          
          socket.send(JSON.stringify({
            type: 'current_deliveries',
            payload: formattedDeliveries,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          fastify.log.error(`Error sending active deliveries on connection: ${error.message}`);
          
          // Check specifically for database connection pool error
          if (error.message?.includes('too many clients already')) {
            fastify.log.warn(`Database connection pool exhausted for courier ${courierId} - sending empty deliveries list`);
            
            // Send empty array instead of disconnecting
            socket.send(JSON.stringify({
              type: 'current_deliveries',
              payload: [],
              timestamp: new Date().toISOString(),
              retryAfter: 5000 // Tell client to retry in 5 seconds
            }));
            
            // Schedule a retry after 5 seconds
            setTimeout(async () => {
              try {
                if (socket.readyState === 1) { // If socket is still open
                  fastify.log.info(`Retrying fetch deliveries for courier ${courierId}`);
                  const retryDeliveries = await deliveryService.getActiveCourierDeliveries(courierId);
                  
                  socket.send(JSON.stringify({
                    type: 'current_deliveries',
                    payload: retryDeliveries.map(d => ({
                      id: d.id,
                      order_id: d.order_id,
                      status: d.status,
                      assigned_at: d.assigned_at.toISOString(),
                      picked_up_at: d.picked_up_at?.toISOString(),
                      delivered_at: d.delivered_at?.toISOString(),
                      estimated_delivery_time: d.estimated_delivery_time?.toISOString()
                    })),
                    timestamp: new Date().toISOString()
                  }));
                }
              } catch (retryError) {
                fastify.log.error(`Retry fetch failed for courier ${courierId}: ${retryError.message}`);
                // Send empty array again but don't disconnect
                if (socket.readyState === 1) {
                  socket.send(JSON.stringify({
                    type: 'current_deliveries',
                    payload: [],
                    timestamp: new Date().toISOString()
                  }));
                }
              }
            }, 5000);
          } else {
            // For other errors, still send empty array to not break the client
            socket.send(JSON.stringify({
              type: 'current_deliveries',
              payload: [],
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          }
        }
        
        // Handle incoming messages from courier
        socket.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
              case 'status_update':
                // Update delivery status
                if (message.delivery_id && message.status) {
                  try {
                    const updatedDelivery = await deliveryService.updateDeliveryStatus(
                      message.delivery_id,
                      message.status,
                      courierId
                    );
                    
                    socket.send(JSON.stringify({
                      type: 'status_update',
                      payload: {
                        success: true,
                        delivery_id: updatedDelivery.id,
                        status: updatedDelivery.status
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
                  await deliveryService.updateCourierLocation(
                    courierId,
                    message.latitude,
                    message.longitude
                  );
                  
                  socket.send(JSON.stringify({
                    type: 'location_update',
                    payload: { success: true },
                    timestamp: new Date().toISOString()
                  }));
                }
                break;
                
              case 'heartbeat':
                // Send immediate confirmation to validate the connection is working both ways
                socket.send(JSON.stringify({
                  type: 'heartbeat_ack',
                  timestamp: new Date().toISOString()
                }));
                break;
              
              case 'sync_deliveries':
                // Manual sync request from client
                fastify.log.info(`Courier ${courierId} requested delivery sync`);
                const syncDeliveries = await deliveryService.getActiveCourierDeliveries(courierId);
                
                socket.send(JSON.stringify({
                  type: 'current_deliveries',
                  payload: syncDeliveries.map(d => ({
                    id: d.id,
                    order_id: d.order_id,
                    status: d.status,
                    assigned_at: d.assigned_at.toISOString(),
                    picked_up_at: d.picked_up_at?.toISOString(),
                    delivered_at: d.delivered_at?.toISOString(),
                    estimated_delivery_time: d.estimated_delivery_time?.toISOString()
                  })),
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

        // Handle disconnection
        socket.on('close', () => {
          deliveryService.handleCourierDisconnection(courierId);
        });
      }
    });
  };
