import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DeliveryService } from './delivery.service';

export interface DeliveryControllerOptions {
    deliveryService: DeliveryService;
}

export const deliveryController: FastifyPluginAsync<DeliveryControllerOptions> = async function (server, { deliveryService }) {
    const typedServer = server.withTypeProvider<TypeBoxTypeProvider>();

    // Assign a delivery for an order
    typedServer.post('/orders/:orderId/delivery', {
        schema: {
            params: Type.Object({
                orderId: Type.Number()
            }),
            response: {
                201: Type.Object({
                    message: Type.String(),
                    deliveryId: Type.Number()
                })
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { orderId } = request.params;
        
        const delivery = await deliveryService.assignDelivery(orderId);
        
        return reply.code(201).send({
            message: 'Delivery assigned successfully',
            deliveryId: delivery.id
        });
    });

    // Get all active deliveries (admin/partner view)
    typedServer.get('/deliveries/active', {
        schema: {
            response: {
                200: Type.Array(Type.Object({
                    delivery_id: Type.Number(),
                    order_id: Type.Number(),
                    status: Type.String(),
                    restaurant_name: Type.String(),
                    restaurant_address: Type.String(),
                    restaurant_latitude: Type.Number(),
                    restaurant_longitude: Type.Number(),
                    customer_address: Type.String(),
                    customer_latitude: Type.Number(),
                    customer_longitude: Type.Number(),
                    estimated_delivery_time: Type.Union([Type.String(), Type.Null()]),
                    created_at: Type.String()
                }))
            }
        },
        preHandler: [server.authenticate]
    }, async (_request, reply) => {
        const deliveries = await deliveryService.getAvailableDeliveries();
        return reply.code(200).send(deliveries);
    });

    // Courier endpoint to accept a delivery
    typedServer.post('/deliveries/:deliveryId/accept', {
        schema: {
            params: Type.Object({
                deliveryId: Type.Number()
            }),
            response: {
                200: Type.Object({
                    message: Type.String(),
                    delivery: Type.Object({
                        id: Type.Number(),
                        order_id: Type.Number(),
                        courier_id: Type.String(),
                        status: Type.String(),
                        accepted_at: Type.Union([Type.String(), Type.Null()])
                    })
                })
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { deliveryId } = request.params;
        const { sub: courierId } = request.user;
        
        const delivery = await deliveryService.acceptDelivery(deliveryId, courierId);
        
        return reply.code(200).send({
            message: 'Delivery accepted',
            delivery: {
                id: delivery.id,
                order_id: delivery.order_id,
                courier_id: delivery.courier_id,
                status: delivery.status,
                accepted_at: delivery.accepted_at
            }
        });
    });

    // Courier endpoint to update delivery status
    typedServer.patch('/deliveries/:deliveryId/status', {
        schema: {
            params: Type.Object({
                deliveryId: Type.Number()
            }),
            body: Type.Object({
                status: Type.Union([
                    Type.Literal('accepted'),      // Add 'accepted' as valid status
                    Type.Literal('picked_up'),
                    Type.Literal('in_transit'),
                    Type.Literal('delivered'),
                    Type.Literal('failed'),
                    Type.Literal('canceled')
                ])
            }),
            response: {
                200: Type.Object({
                    message: Type.String(),
                    status: Type.String()
                })
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { deliveryId } = request.params;
        const { status } = request.body;
        const { sub: courierId } = request.user;
        
        let delivery;
        
        // Special handling for "accepted" status
        if (status === 'accepted') {
            delivery = await deliveryService.acceptDelivery(deliveryId, courierId);
            return reply.code(200).send({
                message: 'Delivery accepted',
                status: delivery.status
            });
        } else {
            // Regular status update for other statuses
            delivery = await deliveryService.updateDeliveryStatus(deliveryId, status, courierId);
            return reply.code(200).send({
                message: 'Delivery status updated',
                status: delivery.status
            });
        }
    });

    // Update courier availability
    typedServer.post('/courier/availability', {
        schema: {
            body: Type.Object({
                is_available: Type.Boolean(),
                is_working: Type.Optional(Type.Boolean())
            }),
            response: {
                200: Type.Object({
                    message: Type.String(),
                    is_available: Type.Boolean(),
                    is_working: Type.Boolean()
                })
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { is_available, is_working } = request.body;
        const { sub: courierId } = request.user;
        
        // Make sure we're passing individual parameters, not an object
        const availability = await deliveryService.setCourierAvailability(
            courierId, 
            is_available, 
            is_working !== undefined ? is_working : undefined
        );
        
        return reply.code(200).send({
            message: 'Availability updated',
            is_available: availability.is_available,
            is_working: availability.is_working
        });
    });

    // Get courier's deliveries
    typedServer.get('/courier/deliveries', {
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { sub: courierId } = request.user;
        const deliveries = await deliveryService.getDeliveriesForCourier(courierId);
        return reply.code(200).send(deliveries);
    });

    // Add an endpoint to get delivery status flow options based on current status
    typedServer.get('/deliveries/:deliveryId/status-options', {
        schema: {
            params: Type.Object({
                deliveryId: Type.Number()
            }),
            response: {
                200: Type.Object({
                    currentStatus: Type.String(),
                    availableStatusOptions: Type.Array(Type.String())
                })
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { deliveryId } = request.params;
        
        try {
            const delivery = await deliveryService.getDeliveryById(deliveryId);
            
            // Define valid status transitions
            const statusFlow = {
                'assigned': ['accepted', 'canceled'],
                'accepted': ['picked_up', 'canceled'],
                'picked_up': ['in_transit', 'delivered', 'failed'],
                'in_transit': ['delivered', 'failed'],
                'delivered': [],
                'failed': [],
                'canceled': []
            };
            
            // Get available options for current status
            const currentStatus = delivery.status;
            const availableStatusOptions = statusFlow[currentStatus] || [];
            
            return reply.code(200).send({
                currentStatus,
                availableStatusOptions
            });
        } catch (error) {
            return reply.code(404).send({
                message: 'Delivery not found',
                error: error.message
            });
        }
    });

    // Add endpoint to manually refresh courier availability
    server.post('/courier/refresh-availability', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        available: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        try {
            const courierId = request.user.sub;
            const isAvailable = await deliveryService.refreshCourierAvailability(courierId);
            
            return {
                available: isAvailable,
                message: isAvailable 
                    ? 'Courier is available for new deliveries' 
                    : 'Courier is not available for new deliveries'
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({
                available: false,
                message: 'Error refreshing courier availability'
            });
        }
    });
};
