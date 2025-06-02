import { FastifyPluginAsync } from 'fastify';
import { TimeEntryService } from './time-entry.service';
import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export const timeEntryController: FastifyPluginAsync<{ 
  timeEntryService: TimeEntryService 
}> = async (fastify, { timeEntryService }) => {
  const typedServer = fastify.withTypeProvider<TypeBoxTypeProvider>();
  
   typedServer.post('/courier/clock-in/', {
    schema: {
      tags: ['Time Entry'],
      security: [{ bearerAuth: [] }],
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          time_entry_id: Type.Number(),
          clock_in: Type.String({ format: 'date-time' }),
          schedule_id: Type.Optional(Type.Number())
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const courierId = request.user.sub;
    const { schedule_id } = request.body || {};
    
    try {
      const result = schedule_id !== undefined
        ? await timeEntryService.clockIn(courierId, schedule_id)
        : await timeEntryService.clockIn(courierId);
        
      return {
        success: true,
        time_entry_id: result.id,
        clock_in: result.clock_in.toISOString(),
        schedule_id: result.schedule_id
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
  
  typedServer.post('/courier/clock-out/', {
    schema: {
      tags: ['Time Entry'],
      security: [{ bearerAuth: [] }],
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          time_entry_id: Type.Number(),
          clock_in: Type.String({ format: 'date-time' }),
          clock_out: Type.String({ format: 'date-time' }),
          schedule_id: Type.Optional(Type.Number())
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
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
        clock_out: result.clock_out?.toISOString(),
        schedule_id: result.schedule_id
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
};
