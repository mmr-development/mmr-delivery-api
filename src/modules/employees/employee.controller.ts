import { FastifyPluginAsync } from 'fastify';
import { CourierApplicationRequest, createCourierApplicationSchema, deleteCourierApplicationSchema, getCourierApplicationSchema, listCourierApplicationsSchema, updateCourierApplicationSchema } from './courier-application/courier.schema';
import { CourierApplicationService } from './courier-application/courier-application.service';
import { CreateVehicleTypeRequest, createVehicleTypeSchema, deleteVehicleTypeSchema, getVehicleTypeByIdSchema, getVehicleTypesSchema, UpdateVehicleTypeRequest, updateVehicleTypeSchema, VehicleTypeService } from './vehicle-types';
import { HourPreferenceService } from './hours-preference/hours-preference.service';
import { SchedulePreferenceService } from './schedule-preference/schedule-preference.service';
import { ControllerError } from '../../utils/errors';
import { CreateSchedulePreference, createSchedulePreferenceSchema, deleteSchedulePreferenceSchema, getAllSchedulePreferencesSchema, getSchedulePreferenceByIdSchema, UpdateSchedulePreference, updateSchedulePreferenceSchema } from './schedule-preference/schedule-preference.schema';
import { deleteHourPreferenceSchema, getAllHourPreferencesSchema, getHourPreferenceByIdSchema, updateHourPreferenceSchema } from './hours-preference';
import { UpdateableEmployeeRow } from './employee.table';

export interface EmployeesControllerOptions {
    courierApplicationService: CourierApplicationService,
    vehicleTypeService: VehicleTypeService
    hourPreferenceService: HourPreferenceService;
    schedulePreferenceService: SchedulePreferenceService;
}

export const employeeController: FastifyPluginAsync<EmployeesControllerOptions> = async function (server, { courierApplicationService, vehicleTypeService, hourPreferenceService, schedulePreferenceService }) {
    server.post<{ Body: CourierApplicationRequest }>('/courier-applications/', { schema: { ...createCourierApplicationSchema } }, async (request, reply) => {
        const { body } = request;
        try {
            const response = await courierApplicationService.submitApplication(body);
            reply.status(201).send(response);
        } catch (error) {
            console.error('Error submitting application:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.get<{
        Querystring: { offset?: number; limit?: number; status?: string; name?: string; user_email?: string }
    }>('/courier-applications/', 
        { schema: { ...listCourierApplicationsSchema },
         preHandler: [server.authenticate, server.guard.role('admin')] },
        async (request, reply) => {
        const { offset, limit, status, name, user_email } = request.query;
        try {
            const {applications, count} = await courierApplicationService.findAllApplications(
                { offset, limit, filters: { status, name, user_email } }
            );
            console.log('Fetched applications:', applications);
            console.log('Total count:', count);
            reply.status(200).send({
                applications,
                pagination: {
                    total: count,
                    offset,
                    limit
                }
            });
        } catch (error) {
            console.error('Error fetching applications:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.get('/courier-applications/:id/', { schema: { ...getCourierApplicationSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const { id } = request.params as { id: number };
        try {
            const application = await courierApplicationService.findApplicationById(id);
            if (!application) {
                return reply.status(404).send({ message: 'Application not found' });
            }
            reply.status(200).send({ message: '', application });
        } catch (error) {
            console.error('Error fetching application:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.patch<{ Params: { id: number }, Body: UpdateableEmployeeRow }>('/courier-applications/:id/', { schema: { ...updateCourierApplicationSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const { id } = request.params;
        const { body } = request;
        try {
            const updatedApplication = await courierApplicationService.updateApplication(id, body);
            reply.status(200).send(updatedApplication);
        } catch (error) {
            console.error('Error updating application:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.delete('/courier-applications/:id/', { schema: { ...deleteCourierApplicationSchema } }, async (request, reply) => {
        const { id } = request.params as { id: number };
        try {
            await courierApplicationService.deleteApplication(id);
            reply.status(204).send();
        } catch (error) {
            console.error('Error deleting application:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.post<{ Body: CreateVehicleTypeRequest }>('/couriers/vehicle-types/', { schema: { ...createVehicleTypeSchema } }, async (request, reply) => {
        const { body } = request;
        try {
            const response = await vehicleTypeService.createVehicleType(body);
            reply.status(201).send(response);
        } catch (error) {
            console.error('Error creating vehicle type:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.get('/couriers/vehicle-types/', { schema: { ...getVehicleTypesSchema } }, async (request, reply) => {
        try {
            const vehicleTypes = await vehicleTypeService.getVehicleTypes();
            reply.status(200).send(vehicleTypes);
        } catch (error) {
            console.error('Error fetching vehicle types:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.get('/couriers/vehicle-types/:id/', { schema: { ...getVehicleTypeByIdSchema } }, async (request, reply) => {
        const { id } = request.params as { id: number };
        try {
            const vehicleType = await vehicleTypeService.getVehicleTypeById(id);
            reply.status(200).send(vehicleType);
        } catch (error) {
            console.error('Error fetching vehicle type:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.patch<{ Body: UpdateVehicleTypeRequest }>('/couriers/vehicle-types/:id/', { schema: { ...updateVehicleTypeSchema } }, async (request, reply) => {
        const { id } = request.params as { id: number };
        const { body } = request;
        try {
            const updatedVehicleType = await vehicleTypeService.updateVehicleType(id, body);
            reply.status(200).send(updatedVehicleType);
        } catch (error) {
            console.error('Error updating vehicle type:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.delete('/couriers/vehicle-types/:id/', { schema: { ...deleteVehicleTypeSchema } }, async (request, reply) => {
        const { id } = request.params as { id: number };
        try {
            await vehicleTypeService.deleteVehicleType(id);
            reply.status(204).send();
        } catch (error) {
            console.error('Error deleting vehicle type:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.get('/couriers/hour-preferences/', { schema: { ...getAllHourPreferencesSchema, tags: ['Courier Hour Preferences'] } }, async (request, reply) => {
        const hourPreferences = await hourPreferenceService.findAllHourPreferences();
        return reply.code(200).send(hourPreferences);
    });

    server.get<{ Params: { id: number } }>('/couriers/hour-preferences/:id/', { schema: { ...getHourPreferenceByIdSchema, tags: ['Courier Hour Preferences'] } }, async (request, reply) => {
        const hourPreference = await hourPreferenceService.findHourPreferenceById(request.params.id);
        if (!hourPreference) {
            throw new ControllerError(
                404,
                'UserNotFound',
                `Hour preference with id ${request.params.id} was not found`
            )
        }
        return reply.code(200).send(hourPreference);
    });

    server.patch<{ Params: { id: number }, Body: UpdateSchedulePreference }>('/couriers/hour-preferences/:id/', { schema: { ...updateHourPreferenceSchema, tags: ['Courier Hour Preferences'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const hourPreference = await hourPreferenceService.updateHourPreference(request.params.id, request.body);
        if (!hourPreference) {
            throw new ControllerError(
                404,
                'UserNotFound',
                `Hour preference with id ${request.params.id} was not found`
            )
        }
        return reply.code(200).send(hourPreference);
    });

    server.delete<{ Params: { id: number } }>('/couriers/hour-preferences/:id/', { schema: { ...deleteHourPreferenceSchema, tags: ['Courier Hour Preferences'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        await hourPreferenceService.deleteHourPreference(request.params.id);
        return reply.code(204).send();
    });

    server.post<{ Body: CreateSchedulePreference }>('/couriers/schedule-preferences/', { schema: { ...createSchedulePreferenceSchema, tags: ['Courier Schedule Preferences'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const { body } = request;
        try {
            const response = await schedulePreferenceService.createSchedulePreference(body);
            reply.status(201).send(response);
        } catch (error) {
            console.error('Error creating schedule preference:', error);
            reply.status(500).send({ message: 'Internal server error' });
        }
    });

    server.get('/couriers/schedule-preferences/', { schema: { ...getAllSchedulePreferencesSchema, tags: ['Courier Schedule Preferences'] } }, async (request, reply) => {
        const schedulePreferences = await schedulePreferenceService.findAllSchedulePreferences();
        return reply.code(200).send(schedulePreferences);
    });

    server.get<{ Params: { id: number } }>('/couriers/schedule-preferences/:id/', { schema: { ...getSchedulePreferenceByIdSchema, tags: ['Courier Schedule Preferences'] } }, async (request, reply) => {
        const schedulePreference = await schedulePreferenceService.findSchedulePreferenceById(request.params.id);
        if (!schedulePreference) {
            throw new ControllerError(
                404,
                'UserNotFound',
                `Schedule preference with id ${request.params.id} was not found`
            )
        }
        return reply.code(200).send(schedulePreference);
    });

    server.patch<{ Params: { id: number }, Body: UpdateSchedulePreference }>('/couriers/schedule-preferences/:id/', { schema: { ...updateSchedulePreferenceSchema, tags: ['Courier Schedule Preferences'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const schedulePreference = await schedulePreferenceService.updateSchedulePreference(request.params.id, request.body);
        if (!schedulePreference) {
            throw new ControllerError(
                404,
                'UserNotFound',
                `Schedule preference with id ${request.params.id} was not found`
            )
        }
        return reply.code(200).send(schedulePreference);
    });

    server.delete<{ Params: { id: number } }>('/couriers/schedule-preferences/:id/', { schema: { ...deleteSchedulePreferenceSchema, tags: ['Courier Schedule Preferences'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        await schedulePreferenceService.deleteSchedulePreference(request.params.id);
        return reply.code(204).send();
    });
}
