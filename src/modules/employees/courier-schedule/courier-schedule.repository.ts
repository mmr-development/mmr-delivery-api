import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { CourierScheduleRow, InsertableCourierScheduleRow, UpdateableCourierScheduleRow, TimeEntryRow, InsertableTimeEntryRow, UpdateableTimeEntryRow } from './schedule.table';

export interface ScheduleRepository {
    createSchedule(schedule: InsertableCourierScheduleRow): Promise<CourierScheduleRow>;
    findScheduleById(id: number): Promise<CourierScheduleRow | undefined>;
    findSchedules(options?: { 
        courier_id?: number; 
        from_date?: string; 
        to_date?: string; 
        status?: string;
        offset?: number;
        limit?: number;
    }): Promise<CourierScheduleRow[]>;
    countSchedules(options?: { 
        courier_id?: number; 
        from_date?: string; 
        to_date?: string; 
        status?: string;
    }): Promise<number>;
    updateSchedule(id: number, schedule: UpdateableCourierScheduleRow): Promise<CourierScheduleRow>;
    deleteSchedule(id: number): Promise<void>;
    
    // Time entry methods
    clockIn(timeEntry: InsertableTimeEntryRow): Promise<TimeEntryRow>;
    clockOut(id: number, clockOut: Date, notes?: string): Promise<TimeEntryRow>;
    findTimeEntryById(id: number): Promise<TimeEntryRow | undefined>;
    findOpenTimeEntry(courier_id: number): Promise<TimeEntryRow | undefined>;
    findTimeEntries(options?: {
        courier_id?: number;
        schedule_id?: number;
        from_date?: string;
        to_date?: string;
        offset?: number;
        limit?: number;
    }): Promise<TimeEntryRow[]>;
    countTimeEntries(options?: {
        courier_id?: number;
        schedule_id?: number;
        from_date?: string;
        to_date?: string;
    }): Promise<number>;
}

export function createCourierScheduleRepository(db: Kysely<Database>): ScheduleRepository {
    return {
        async createSchedule(schedule) {
            return await db.insertInto('courier_schedule')
                .values(schedule)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        
        async findScheduleById(id) {
            return await db.selectFrom('courier_schedule')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
        },
        
        async findSchedules(options) {
            let query = db.selectFrom('courier_schedule').selectAll();
            
            if (options?.courier_id) {
                query = query.where('courier_id', '=', options.courier_id);
            }
            
            if (options?.from_date) {
                query = query.where('date', '>=', options.from_date);
            }
            
            if (options?.to_date) {
                query = query.where('date', '<=', options.to_date);
            }
            
            if (options?.status) {
                query = query.where('status', '=', options.status);
            }
            
            if (options?.offset !== undefined) {
                query = query.offset(options.offset);
            }
            
            if (options?.limit !== undefined) {
                query = query.limit(options.limit);
            }
            
            return await query.orderBy('date', 'asc')
                .orderBy('start_time', 'asc')
                .execute();
        },
        
        async countSchedules(options) {
            let query = db.selectFrom('courier_schedule')
                .select(({ fn }) => [fn.count<number>('id').as('count')]);
            
            if (options?.courier_id) {
                query = query.where('courier_id', '=', options.courier_id);
            }
            
            if (options?.from_date) {
                query = query.where('date', '>=', options.from_date);
            }
            
            if (options?.to_date) {
                query = query.where('date', '<=', options.to_date);
            }
            
            if (options?.status) {
                query = query.where('status', '=', options.status);
            }
            
            const result = await query.executeTakeFirst();
            return Number(result?.count || 0);
        },
        
        async updateSchedule(id, schedule) {
            return await db.updateTable('courier_schedule')
                .set(schedule)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        
        async deleteSchedule(id) {
            await db.deleteFrom('courier_schedule')
                .where('id', '=', id)
                .executeTakeFirstOrThrow();
        },
        
        // Time entry implementations
        async clockIn(timeEntry) {
            return await db.insertInto('time_entry')
                .values(timeEntry)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        
        async clockOut(id, clockOut, notes) {
            const updates: UpdateableTimeEntryRow = { 
                clock_out: clockOut,
                updated_at: new Date()
            };
            
            if (notes) {
                updates.notes = notes;
            }
            
            return await db.updateTable('time_entry')
                .set(updates)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        
        async findTimeEntryById(id) {
            return await db.selectFrom('time_entry')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
        },
        
        async findOpenTimeEntry(courier_id) {
            return await db.selectFrom('time_entry')
                .selectAll()
                .where('courier_id', '=', courier_id)
                .where('clock_out', 'is', null)
                .orderBy('clock_in', 'desc')
                .executeTakeFirst();
        },
        
        async findTimeEntries(options) {
            let query = db.selectFrom('time_entry').selectAll();
            
            if (options?.courier_id) {
                query = query.where('courier_id', '=', options.courier_id);
            }
            
            if (options?.schedule_id) {
                query = query.where('schedule_id', '=', options.schedule_id);
            }
            
            if (options?.from_date) {
                query = query.where('clock_in', '>=', options.from_date);
            }
            
            if (options?.to_date) {
                query = query.where('clock_in', '<=', options.to_date);
            }
            
            if (options?.offset !== undefined) {
                query = query.offset(options.offset);
            }
            
            if (options?.limit !== undefined) {
                query = query.limit(options.limit);
            }
            
            return await query.orderBy('clock_in', 'desc')
                .execute();
        },
        
        async countTimeEntries(options) {
            let query = db.selectFrom('time_entry')
                .select(({ fn }) => [fn.count<number>('id').as('count')]);
            
            if (options?.courier_id) {
                query = query.where('courier_id', '=', options.courier_id);
            }
            
            if (options?.schedule_id) {
                query = query.where('schedule_id', '=', options.schedule_id);
            }
            
            if (options?.from_date) {
                query = query.where('clock_in', '>=', options.from_date);
            }
            
            if (options?.to_date) {
                query = query.where('clock_in', '<=', options.to_date);
            }
            
            const result = await query.executeTakeFirst();
            return Number(result?.count || 0);
        }
    };
}