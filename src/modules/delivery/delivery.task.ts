import { FastifyPluginAsync } from 'fastify';
import { DeliveryService } from './delivery.service';

// This plugin sets up recurring tasks for delivery system
export const deliveryTaskPlugin: (deliveryService: DeliveryService) => FastifyPluginAsync =
  (deliveryService) => async (fastify) => {
    // Run as a fallback every 2 minutes to check for missed orders
    const assignmentInterval = setInterval(async () => {
      try {
        fastify.log.info('Running fallback delivery assignment task...');
        await deliveryService.assignPendingDeliveries();
      } catch (error) {
        fastify.log.error('Error running delivery assignment task:', error);
      }
    }, 20000); // 2 minutes

    // Run connection health check every 60 seconds to clean stale connections
    const connectionCheckInterval = setInterval(() => {
      try {
        fastify.log.debug('Running connection health check...');
        deliveryService.cleanStaleConnections();
      } catch (error) {
        fastify.log.error('Error running connection health check:', error);
      }
    }, 60000); // 1 minute

    // Clean up on server shutdown
    fastify.addHook('onClose', (instance, done) => {
      clearInterval(assignmentInterval);
      clearInterval(connectionCheckInterval);
      done();
    });
  };
