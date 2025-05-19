import { FastifyPluginAsync } from 'fastify';
import { DeliveryService } from './delivery.service';
import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export const deliveryController: FastifyPluginAsync<{ 
  deliveryService: DeliveryService;
}> = async (fastify, { deliveryService }) => {
  const typedServer = fastify.withTypeProvider<TypeBoxTypeProvider>();
  
  // Get courier's ACTIVE deliveries only (not completed ones)
  typedServer.get('/courier/deliveries', {
    schema: {
      response: {
        200: Type.Array(Type.Object({
          id: Type.Number(),
          order_id: Type.Number(),
          status: Type.String(),
          assigned_at: Type.String({format: 'date-time'}),
          picked_up_at: Type.Optional(Type.String({format: 'date-time'})),
          delivered_at: Type.Optional(Type.String({format: 'date-time'})),
          estimated_delivery_time: Type.Optional(Type.String({format: 'date-time'})),
          // Add new fields to schema
          pickup: Type.Optional(Type.Object({
            name: Type.String(),
            lat: Type.Optional(Type.Number()),
            lng: Type.Optional(Type.Number())
          })),
          delivery: Type.Optional(Type.Object({
            customer_name: Type.String(),
            phone: Type.Optional(Type.String()),
            address: Type.Optional(Type.String()),
            lat: Type.Optional(Type.Number()),
            lng: Type.Optional(Type.Number())
          })),
          order: Type.Optional(Type.Object({
            total_amount: Type.Number(),
            tip_amount: Type.Optional(Type.Number()),
            items: Type.Array(Type.Object({
              item_name: Type.String(),
              quantity: Type.Number(),
              price: Type.Number(),
              note: Type.Optional(Type.String())
            }))
          }))
        }))
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Extract courier ID from JWT token
      const courierId = request.user.sub;
      
      // Wrap in try-catch with better error handling
      let deliveries;
      try {
        // Use a transaction to ensure connection release
        deliveries = await deliveryService.getActiveCourierDeliveries(courierId);
      } catch (dbError) {
        fastify.log.error(`Database error getting courier deliveries: ${dbError.message}`);
        
        if (dbError.message?.includes('too many clients already')) {
          return reply
            .code(503)
            .header('Retry-After', '5')
            .send([]);  // Empty array so client doesn't break
        }
        
        // For other errors, also return empty array
        return [];
      }
      
      // Format the response with enhanced data
      return deliveries.map(d => ({
        id: d.id,
        order_id: d.order_id,
        status: d.status,
        assigned_at: d.assigned_at.toISOString(),
        picked_up_at: d.picked_up_at?.toISOString(),
        delivered_at: d.delivered_at?.toISOString(),
        estimated_delivery_time: d.estimated_delivery_time?.toISOString(),
        // Include enhanced data
        pickup: d.pickup ? {
          name: d.pickup.name,
          lat: d.pickup.latitude,
          lng: d.pickup.longitude
        } : null,
        delivery: d.delivery ? {
          customer_name: d.delivery.customer_name,
          phone: d.delivery.phone,
          address: d.delivery.address,
          lat: d.delivery.lat,
          lng: d.delivery.lng
        } : null,
        order: d.order ? {
          total_amount: d.order.total_amount,
          tip_amount: d.order.tip_amount,
          items: d.order.items?.map(item => ({
            item_name: item.item_name,
            quantity: item.quantity,
            price: item.price,
            note: item.note
          }))
        } : null
      }));
    } catch (error) {
      // Log the error with full details
      fastify.log.error(`Error in courier deliveries endpoint: ${error.message}`);
      
      // Return empty array to not break the client
      return reply.code(500).send([]);
    }
  });
  
  // Update delivery status
  typedServer.patch('/deliveries/:id/status', {
    schema: {
      params: Type.Object({
        id: Type.Number()
      }),
      body: Type.Object({
        status: Type.String({enum: ['assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'canceled']})
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          delivery: Type.Object({
            id: Type.Number(),
            order_id: Type.Number(),
            status: Type.String()
          })
        }),
        400: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        }),
        403: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const courierId = request.user.sub;
      const deliveryId = request.params.id;
      const { status } = request.body;
      
      fastify.log.info(`Updating delivery #${deliveryId} to status "${status}" by courier ${courierId}`);
      
      const updatedDelivery = await deliveryService.updateDeliveryStatus(
        deliveryId,
        status,
        courierId
      );
      
      fastify.log.info(`Successfully updated delivery #${deliveryId} to status "${status}"`);
      
      return {
        success: true,
        delivery: {
          id: updatedDelivery.id,
          order_id: updatedDelivery.order_id,
          status: updatedDelivery.status
        }
      };
    } catch (error) {
      fastify.log.error(`Error updating delivery status: ${error.message}`);
      
      // Handle specific error types
      if (error.name === 'DeliveryNotFound') {
        reply.code(404);
        return {
          success: false,
          error: 'NOT_FOUND',
          message: error.message
        };
      } else if (error.name === 'Unauthorized') {
        reply.code(403);
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: error.message
        };
      } else if (error.name === 'InvalidStatusTransition') {
        reply.code(400);
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: error.message
        };
      }
      
      // Generic error
      reply.code(500);
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred while updating the delivery status'
      };
    }
  });
  
  // Check courier's connection status
  typedServer.get('/courier/status', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    // Use sub instead of id
    const courierId = request.user.sub;
    const isConnected = deliveryService.isConnected(courierId);
    
    return {
      courier_id: courierId,
      connected: isConnected
    };
  });
  
  // Manual assignment endpoint (for testing)
  typedServer.post('/deliveries/assign/:orderId', {
    schema: {
      params: Type.Object({
        orderId: Type.Number()
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          delivery_id: Type.Optional(Type.Number()),
          message: Type.String()
        })
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const orderId = request.params.orderId;
    
    const delivery = await deliveryService.assignDeliveryAutomatically(orderId);
    
    if (delivery) {
      return {
        success: true,
        delivery_id: delivery.id,
        message: `Delivery assigned to courier ${delivery.courier_id}`
      };
    } else {
      return {
        success: false,
        message: 'No available couriers or order not eligible for delivery'
      };
    }
  });
};
