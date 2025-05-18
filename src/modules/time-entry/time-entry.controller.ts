import { FastifyPluginAsync } from 'fastify';
import { TimeEntryService } from './time-entry.service';
import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export const timeEntryController: FastifyPluginAsync<{ 
  timeEntryService: TimeEntryService 
}> = async (fastify, { timeEntryService }) => {
  const typedServer = fastify.withTypeProvider<TypeBoxTypeProvider>();
  
  // Clock in endpoint
  typedServer.post('/courier/clock-in', {
    schema: {
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          time_entry_id: Type.Number(),
          clock_in: Type.String({ format: 'date-time' })
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    // Use sub instead of id
    const courierId = request.user.sub;
    
    try {
      const result = await timeEntryService.clockIn(courierId);
      return {
        success: true,
        time_entry_id: result.id,
        clock_in: result.clock_in.toISOString()
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
  
  // Clock out endpoint
  typedServer.post('/courier/clock-out', {
    schema: {
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          time_entry_id: Type.Number(),
          clock_in: Type.String({ format: 'date-time' }),
          clock_out: Type.String({ format: 'date-time' })
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    // Use sub instead of id
    const courierId = request.user.sub;
    
    try {
      const result = await timeEntryService.clockOut(courierId);
      if (!result) {
        return reply.code(400).send({
          success: false,
          message: 'No active time entry found'
        });
      }
      
      return {
        success: true,
        time_entry_id: result.id,
        clock_in: result.clock_in.toISOString(),
        clock_out: result.clock_out?.toISOString()
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
};
