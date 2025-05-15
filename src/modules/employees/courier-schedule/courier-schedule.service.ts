import { ScheduleRepository } from './courier-schedule.repository';
import { CourierScheduleRow, TimeEntryRow } from './schedule.table';
import { ClockIn, ClockOut, CourierSchedule, CreateCourierSchedule, TimeEntry, UpdateCourierSchedule } from './schedule.schema';
import { ControllerError } from '../../../utils/errors';

export interface CourierScheduleService {
    createSchedule(schedule: CreateCourierSchedule): Promise<CourierSchedule>;
    getScheduleById(id: number): Promise<CourierSchedule | undefined>;
    getSchedules(options?: { 
        courier_id?: number; 
        from_date?: string; 
        to_date?: string; 
        status?: string;
        offset?: number;
        limit?: number;
    }): Promise<{ 
        schedules: CourierSchedule[]; 
        pagination: { 
            total: number; 
            offset?: number; 
            limit?: number; 
        } 
    }>;
    updateSchedule(id: number, schedule: UpdateCourierSchedule): Promise<CourierSchedule>;
    deleteSchedule(id: number): Promise<void>;
    
    // Time tracking methods
    clockIn(courier_id: number, data: ClockIn): Promise<TimeEntry>;
    clockOut(courier_id: number, data: ClockOut): Promise<TimeEntry>;
    getTimeEntries(options?: {
        courier_id?: number;
        schedule_id?: number;
        from_date?: string;
        to_date?: string;
        offset?: number;
        limit?: number;
    }): Promise<{ 
        time_entries: TimeEntry[]; 
        pagination: { 
            total: number; 
            offset?: number; 
            limit?: number; 
        } 
    }>;
    getCurrentStatus(courier_id: number): Promise<{ is_clocked_in: boolean; current_entry?: TimeEntry }>;
}

export function createCourierScheduleService(repository: ScheduleRepository): CourierScheduleService {
    return {
        async createSchedule(schedule) {
            const created = await repository.createSchedule({
                ...schedule,
                status: 'scheduled'
            });
            
            return scheduleRowToSchedule(created);
        },
        
        async getScheduleById(id) {
            const schedule = await repository.findScheduleById(id);
            if (!schedule) return undefined;
            
            return scheduleRowToSchedule(schedule);
        },
        
        async getSchedules(options) {
            const [schedules, total] = await Promise.all([
                repository.findSchedules(options),
                repository.countSchedules(options)
            ]);
            
            return {
                schedules: schedules.map(scheduleRowToSchedule),
                pagination: {
                    total,
                    offset: options?.offset,
                    limit: options?.limit
                }
            };
        },
        
        async updateSchedule(id, schedule) {
            const updated = await repository.updateSchedule(id, schedule);
            return scheduleRowToSchedule(updated);
        },
        
        async deleteSchedule(id) {
            await repository.deleteSchedule(id);
        },
        
        // Time tracking implementations
        async clockIn(courier_id, data) {
            // Check if courier is already clocked in
            const openEntry = await repository.findOpenTimeEntry(courier_id);
            if (openEntry) {
                throw new ControllerError(
                    400,
                    'AlreadyClockedIn',
                    'Courier is already clocked in. Please clock out first.'
                );
            }
            
            const entry = await repository.clockIn({
                courier_id,
                schedule_id: data.schedule_id || null,
                clock_in: new Date(),
                clock_out: null,
                notes: data.notes || null
            });
            
            return timeEntryRowToTimeEntry(entry);
        },
        
        async clockOut(courier_id, data) {
            // Find the open time entry for this courier
            const openEntry = await repository.findOpenTimeEntry(courier_id);
            if (!openEntry) {
                throw new ControllerError(
                    400,
                    'NotClockedIn',
                    'Courier is not currently clocked in'
                );
            }
            
            const entry = await repository.clockOut(
                openEntry.id,
                new Date(),
                data.notes
            );
            
            return timeEntryRowToTimeEntry(entry);
        },
        
        async getTimeEntries(options) {
            const [entries, total] = await Promise.all([
                repository.findTimeEntries(options),
                repository.countTimeEntries(options)
            ]);
            
            return {
                time_entries: entries.map(timeEntryRowToTimeEntry),
                pagination: {
                    total,
                    offset: options?.offset,
                    limit: options?.limit
                }
            };
        },
        
        async getCurrentStatus(courier_id) {
            const openEntry = await repository.findOpenTimeEntry(courier_id);
            
            if (openEntry) {
                return {
                    is_clocked_in: true,
                    current_entry: timeEntryRowToTimeEntry(openEntry)
                };
            }
            
            return { is_clocked_in: false };
        }
    };
}

// Helper functions to convert between DB rows and API types
function scheduleRowToSchedule(row: CourierScheduleRow): CourierSchedule {
    return {
        id: row.id,
        courier_id: row.courier_id,
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

function timeEntryRowToTimeEntry(row: TimeEntryRow): TimeEntry {
    return {
        id: row.id,
        courier_id: row.courier_id,
        schedule_id: row.schedule_id,
        clock_in: row.clock_in instanceof Date ? row.clock_in.toISOString() : row.clock_in.toString(),
        clock_out: row.clock_out instanceof Date ? row.clock_out.toISOString() : row.clock_out,
        notes: row.notes,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at.toString(),
        updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at.toString(),
    };
}