import { FastifyPluginAsync } from 'fastify';
import { OrderService } from './order.service';
import { WebSocket } from 'ws';

// Track connections by order ID
const orderSubscriptions = new Map<number, Set<WebSocket>>();

interface OrderStatusMessage {
    type: 'status_update' | 'error';
    order_id?: number;
    status?: string;
    timestamp?: string;
    message?: string;
}

function addSubscription(orderId: number, socket: WebSocket) {
    if (!orderSubscriptions.has(orderId)) {
        orderSubscriptions.set(orderId, new Set());
    }
    orderSubscriptions.get(orderId)!.add(socket);
}

function removeSubscription(orderId: number, socket: WebSocket) {
    if (orderSubscriptions.has(orderId)) {
        orderSubscriptions.get(orderId)!.delete(socket);
        if (orderSubscriptions.get(orderId)!.size === 0) {
            orderSubscriptions.delete(orderId);
        }
    }
}

// This function will be called when an order status changes
export function broadcastOrderStatusUpdate(orderId: number, status: string) {
    if (!orderSubscriptions.has(orderId)) return;

    const message: OrderStatusMessage = {
        type: 'status_update',
        order_id: orderId,
        status: status,
        timestamp: new Date().toISOString()
    };

    const payload = JSON.stringify(message);
    orderSubscriptions.get(orderId)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

export const orderWebsocketPlugin: (orderService: OrderService) => FastifyPluginAsync =
    (orderService) => async (fastify) => {

        // WebSocket endpoint for order status subscriptions
        fastify.get<{ Params: { order_id: number } }>(
            '/ws/orders/:order_id/status',
            { websocket: true },
            async (connection, req) => {
                const orderId = Number(req.params.order_id);
                const socket = connection;

                try {
                    const order = await orderService.findOrderById(orderId);

                    if (!order) {
                        socket.send(JSON.stringify({
                            type: 'error',
                            message: 'Order not found'
                        }));
                        socket.close();
                        return;
                    }

                    // Subscribe to order status updates
                    addSubscription(orderId, socket);

                    // Send current status
                    socket.send(JSON.stringify({
                        type: 'status_update',
                        order_id: orderId,
                        status: order.status,
                        timestamp: new Date().toISOString()
                    }));

                    // Handle disconnection
                    socket.on('close', () => {
                        removeSubscription(orderId, socket);
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
