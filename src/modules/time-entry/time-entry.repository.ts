import { Kysely, Generated } from 'kysely';
import { Database } from '../../database';
import { TimeEntryRow } from './time-entry.types';

export interface TimeEntryRepository {
  findActiveTimeEntry(employeeId: number): Promise<TimeEntryRow | undefined>;
  createTimeEntry(courierId: number, scheduleId?: number): Promise<TimeEntryRow>;
  closeTimeEntry(timeEntryId: number): Promise<TimeEntryRow>;
  findEmployeeByUserId(userId: string): Promise<{ id: number } | undefined>;
  findAllTimeEntries(courierId: string): Promise<TimeEntryRow[]>;
}

export const createTimeEntryRepository = (db: Kysely<Database>): TimeEntryRepository => {
  return {
    async findActiveTimeEntry(employeeId: number): Promise<TimeEntryRow | undefined> {
      return await db
        .selectFrom('time_entry')
        .selectAll()
        .where('courier_id', '=', employeeId)
        .where('clock_out', 'is', null)
        .executeTakeFirst();
    },

    async createTimeEntry(courierId: number, scheduleId?: number): Promise<TimeEntryRow> {
      return await db
        .insertInto('time_entry')
        .values({
          courier_id: courierId,
          clock_in: new Date(),
          schedule_id: scheduleId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    },

    async closeTimeEntry(timeEntryId: number): Promise<TimeEntryRow> {
      return await db
        .updateTable('time_entry')
        .set({
          clock_out: new Date(),
          updated_at: new Date()
        })
        .where('id', '=', timeEntryId)
        .returningAll()
        .executeTakeFirstOrThrow();
    },

    async findEmployeeByUserId(userId: string): Promise<{ id: number } | undefined> {
      return await db
        .selectFrom('employee')
        .select(['id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
    },
    
    async findAllTimeEntries(courierId: string): Promise<TimeEntryRow[]> {
      const employee = await this.findEmployeeByUserId(courierId);
      if (!employee) {
        return [];
      }
      
      return await db
        .selectFrom('time_entry')
        .selectAll()
        .where('courier_id', '=', employee.id)
        .orderBy('created_at', 'desc')
        .execute();
    }
  };
};
