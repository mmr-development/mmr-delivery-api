import { FastifyPluginAsync } from 'fastify';
import { DeliveryService } from './delivery.service';
import { CourierConnectionManager } from './courier-connection-manager';

export const deliveryTaskPlugin: (deliveryService: DeliveryService, connectionManager: CourierConnectionManager) => FastifyPluginAsync =
  (deliveryService, connectionManager) => async (fastify) => {
    const assignmentInterval = setInterval(async () => {
      try {
        fastify.log.info('Running fallback delivery assignment task...');
        await deliveryService.assignPendingDeliveries();
      } catch (error) {
        fastify.log.error('Error running delivery assignment task:', error);
      }
    }, 20000); // 20 seconds

    // Run connection health check every 60 seconds to clean stale connections
    const connectionCheckInterval = setInterval(() => {
      try {
        fastify.log.debug('Running connection health check...');
        connectionManager.cleanStaleConnections();
      } catch (error) {
        fastify.log.error('Error running connection health check:', error);
      }
    }, 60000); // 1 minute

    fastify.addHook('onClose', (instance, done) => {
      clearInterval(assignmentInterval);
      clearInterval(connectionCheckInterval);
      done();
    });
  };
