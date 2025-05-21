import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { OrderService } from '../orders/order.service';

const partnerSubscriptions = new Map<number, Set<WebSocket>>();

function addSubscription(partnerId: number, socket: WebSocket) {
    if (!partnerSubscriptions.has(partnerId)) {
        partnerSubscriptions.set(partnerId, new Set());
    }
    partnerSubscriptions.get(partnerId)!.add(socket);
}

function removeSubscription(partnerId: number, socket: WebSocket) {
    if (partnerSubscriptions.has(partnerId)) {
        partnerSubscriptions.get(partnerId)!.delete(socket);
        if (partnerSubscriptions.get(partnerId)!.size === 0) {
            partnerSubscriptions.delete(partnerId);
        }
    }
}

export function broadcastPartnerMessage(
    partnerId: number,
    message: { type: string; data: any }
) {
    if (!partnerSubscriptions.has(partnerId)) return;

    const payload = JSON.stringify(message);
    partnerSubscriptions.get(partnerId)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

export const partnerWebsocketPlugin: (orderService: OrderService) => FastifyPluginAsync =
    (orderService) => async (fastify) => {

        fastify.get<{ Params: { partner_id: number } }>(
            '/ws/partners/:partner_id/orders/',
            { websocket: true },
            async (connection, req) => {
                const partnerId = Number(req.params.partner_id);
                const socket = connection;
                addSubscription(partnerId, socket);
                try {
                    const orders = await orderService.findOrdersByPartnerId(partnerId);

                    socket.send(JSON.stringify({
                        type: 'orders',
                        data: orders
                    }));

                     socket.on('message', async (message) => {
                        let parsedMessage;
                        try {
                            if (!message || message.toString().trim() === '') {
                                socket.send(JSON.stringify({
                                    type: 'error',
                                    message: 'Empty message received'
                                }));
                                return;
                            }
                            parsedMessage = JSON.parse(message.toString());
                        } catch (err) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                message: 'Invalid JSON message'
                            }));
                            return;
                        }

                        if (parsedMessage.type === 'status_update') {
                            const { orderId, status } = parsedMessage.data;

                            try {
                                await orderService.updateOrder(orderId, status);
                                const updatedOrder = await orderService.findOrderById(orderId);

                                socket.send(JSON.stringify({
                                    type: 'order_status_updated',
                                    data: {
                                        order: updatedOrder
                                    }
                                }));
                            } catch (err) {
                                socket.send(JSON.stringify({
                                    type: 'error',
                                    message: 'Failed to update order status'
                                }));
                            }
                        }
                    });

                    socket.on('close', () => {
                        removeSubscription(partnerId, socket);
                    });

                } catch (error) {
                    // Error handling
                    socket.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to subscribe to order status'
                    }));
                    socket.close();
                }
            }
        );
    };
