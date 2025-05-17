import { FastifyPluginAsync } from 'fastify';
import { CourierScheduleService } from './courier-schedule.service';
import { ClockIn, ClockOut, CreateCourierSchedule, UpdateCourierSchedule, createScheduleSchema, getSchedulesSchema, updateScheduleSchema } from './courier-schedule.schema';

export interface CourierScheduleControllerOptions {
    courierScheduleService: CourierScheduleService;
}

export const courierScheduleController: FastifyPluginAsync<CourierScheduleControllerOptions> = async function (server, { courierScheduleService }) {
    // Schedule management endpoints
    server.post<{ Body: CreateCourierSchedule }>(
        '/couriers/schedules/',
        { 
            schema: createScheduleSchema,
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const schedule = await courierScheduleService.createSchedule(request.body);
            return reply.code(201).send(schedule);
        }
    );
    
    server.get<{ 
        Querystring: { 
            courier_id?: number; 
            from_date?: string; 
            to_date?: string; 
            status?: string;
            offset?: number;
            limit?: number;
        } 
    }>(
        '/couriers/schedules/',
        { 
            schema: getSchedulesSchema,
            preHandler: [server.authenticate]
        },
        async (request, reply) => {
            const user = request.user.sub ;
            let query = request.query;
            
            const schedules = await courierScheduleService.getSchedules(query);
            return reply.send(schedules);
        }
    );
    
    server.get<{ Params: { id: number } }>(
        '/couriers/schedules/:id/',
        { 
            schema: {
                // Define schema here
            },
            preHandler: [server.authenticate]
        },
        async (request, reply) => {
            const schedule = await courierScheduleService.getScheduleById(request.params.id);
            
            if (!schedule) {
                return reply.code(404).send({
                    message: 'Schedule not found'
                });
            }
            
            return reply.send(schedule);
        }
    );
    
    server.patch<{ Params: { id: number }, Body: UpdateCourierSchedule }>(
        '/couriers/schedules/:id/',
        { 
            schema: {
updateScheduleSchema
            },
            preHandler: [server.authenticate, server.guard.role('admin')]
        },
        async (request, reply) => {
            const schedule = await courierScheduleService.updateSchedule(
                request.params.id,
                request.body
            );
            return reply.send(schedule);
        }
    );
    
    // server.delete<{ Params: { id: number } }>(
    //     '/couriers/schedules/:id/',
    //     { 
    //         schema: {
    //             // Define schema here
    //         },
    //         preHandler: [server.authenticate, server.guard.role('admin')]
    //     },
    //     async (request, reply) => {
    //         await scheduleService.deleteSchedule(request.params.id);
    //         return reply.code(204).send();
    //     }
    // );
    
    // // Time tracking endpoints
    // server.post<{ Body: ClockIn }>(
    //     '/couriers/clock-in/',
    //     { 
    //         schema: {
    //             // Define schema here
    //         },
    //         preHandler: [server.authenticate]
    //     },
    //     async (request, reply) => {
    //         const employee = await server.getUserEmployee(request.user.id);
            
    //         if (!employee) {
    //             return reply.code(403).send({
    //                 message: 'Access denied. User is not a courier.'
    //             });
    //         }
            
    //         const timeEntry = await scheduleService.clockIn(
    //             employee.id,
    //             request.body
    //         );
            
    //         return reply.code(201).send(timeEntry);
    //     }
    // );
    
    // server.post<{ Body: ClockOut }>(
    //     '/couriers/clock-out/',
    //     { 
    //         schema: {
    //             // Define schema here
    //         },
    //         preHandler: [server.authenticate]
    //     },
    //     async (request, reply) => {
    //         const employee = await server.getUserEmployee(request.user.sub);
            
    //         if (!employee) {
    //             return reply.code(403).send({
    //                 message: 'Access denied. User is not a courier.'
    //             });
    //         }
            
    //         const timeEntry = await courierScheduleService.clockOut(
    //             employee.id,
    //             request.body
    //         );
            
    //         return reply.code(200).send(timeEntry);
    //     }
    // );
    
    // server.get(
    //     '/couriers/status/',
    //     { 
    //         schema: {
    //             // Define schema here
    //         },
    //         preHandler: [server.authenticate]
    //     },
    //     async (request, reply) => {
    //         const employee = await server.getUserEmployee(request.user.id);
            
    //         if (!employee) {
    //             return reply.code(403).send({
    //                 message: 'Access denied. User is not a courier.'
    //             });
    //         }
            
    //         const status = await scheduleService.getCurrentStatus(employee.id);
    //         return reply.send(status);
    //     }
    // );
    
    // server.get<{ 
    //     Querystring: { 
    //         courier_id?: number; 
    //         schedule_id?: number;
    //         from_date?: string; 
    //         to_date?: string;
    //         offset?: number;
    //         limit?: number;
    //     } 
    // }>(
    //     '/couriers/time-entries/',
    //     { 
    //         schema: {
    //             // Define schema here
    //         },
    //         preHandler: [server.authenticate]
    //     },
    //     async (request, reply) => {
    //         const user = request.user;
    //         let query = request.query;
            
    //         if (!request.isAdmin) {
    //             const employee = await server.getUserEmployee(user.id);
    //             if (!employee) {
    //                 return reply.code(403).send({ 
    //                     message: 'Access denied. User is not a courier.'
    //                 });
    //             }
    //             query.courier_id = employee.id;
    //         }
            
    //         const entries = await scheduleService.getTimeEntries(query);
    //         return reply.send(entries);
    //     }
    // );
};