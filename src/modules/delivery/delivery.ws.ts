import { FastifyInstance } from 'fastify';
import { DeliveryService } from './delivery.service';
import { WebSocket } from 'ws';

interface DeliveryClient {
    connection: WebSocket;
    courierId: string;
}

const deliveryClients: DeliveryClient[] = [];

export async function broadcastToDeliveryCouriers(event: string, data: any): Promise<void> {
    const message = JSON.stringify({ event, data });
    
    deliveryClients.forEach(client => {
        if (client.connection.readyState === WebSocket.OPEN) {
            client.connection.send(message);
        }
    });
}

export function deliveryWebsocketPlugin(deliveryService: DeliveryService) {
    return async function(fastify: FastifyInstance) {
        fastify.get('/ws/delivery', { 
            websocket: true,
            preHandler: fastify.authenticate
        }, (connection, request) => {
            // Extract courier ID from authenticated user token instead of URL params
            const courierId = request.user.sub;
            
            console.log(`Courier ${courierId} connected to delivery websocket`);
            
            // Register the connection
            const client: DeliveryClient = { connection, courierId };
            deliveryClients.push(client);
            
            // Send active deliveries to the courier upon connection
            deliveryService.getAvailableDeliveries().then(deliveries => {
                connection.send(JSON.stringify({ 
                    event: 'available_deliveries', 
                    data: deliveries 
                }));
            });
            
            connection.on('message', async (message) => {
                try {
                    const parsedMessage = JSON.parse(message.toString());
                    const { event, data } = parsedMessage;
                    
                    switch (event) {
                        case 'update_location':
                            await deliveryService.updateCourierLocation({
                                courier_id: courierId,
                                latitude: data.latitude,
                                longitude: data.longitude
                            });
                            break;
                            
                        case 'accept_delivery':
                            await deliveryService.acceptDelivery(data.deliveryId, courierId);
                            // Send confirmation to the courier
                            connection.send(JSON.stringify({ 
                                event: 'delivery_accepted', 
                                data: { deliveryId: data.deliveryId }
                            }));
                            
                            // Send location data for navigation
                            const locations = await deliveryService.getDeliveryLocations(data.deliveryId);
                            connection.send(JSON.stringify({
                                event: 'delivery_locations',
                                data: { deliveryId: data.deliveryId, ...locations }
                            }));
                            break;
                            
                        case 'update_delivery_status':
                            await deliveryService.updateDeliveryStatus(
                                data.deliveryId,
                                data.status,
                                courierId
                            );
                            break;
                            
                        case 'set_availability':
                            await deliveryService.setCourierAvailability(
                                courierId,
                                data.isAvailable,
                                data.isWorking
                            );
                            break;
                            
                        default:
                            console.log(`Unknown event: ${event}`);
                    }
                } catch (err) {
                    console.error('Error processing message:', err);
                    connection.send(JSON.stringify({ 
                        event: 'error', 
                        data: { message: 'Failed to process request' } 
                    }));
                }
            });
            
            connection.on('close', () => {
                console.log(`Courier ${courierId} disconnected from delivery websocket`);
                const index = deliveryClients.findIndex(c => c.connection === connection);
                if (index !== -1) {
                    deliveryClients.splice(index, 1);
                }
            });
        });
    };
}
