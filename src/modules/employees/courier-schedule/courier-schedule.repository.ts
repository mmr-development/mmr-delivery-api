import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { CourierScheduleRow, InsertableCourierScheduleRow, UpdateableCourierScheduleRow } from './schedule.table';
import { GetSchedulesOptions } from './courier-schedule.service';

export interface ScheduleRepository {
    createSchedule(schedule: InsertableCourierScheduleRow): Promise<CourierScheduleRow>;
    getSchedules(options: GetSchedulesOptions): Promise<{ schedules: CourierScheduleRow[]; total: number }>;
    getScheduleById(id: number): Promise<CourierScheduleRow | undefined>;
    updateSchedule(id: number, schedule: UpdateableCourierScheduleRow): Promise<CourierScheduleRow>;
    deleteSchedule(id: number): Promise<void>;
    getPersonalSchedules(courierId: number, fromDate?: Date, toDate?: Date): Promise<CourierScheduleRow[]>;
}

export function createCourierScheduleRepository(db: Kysely<Database>): ScheduleRepository {
    return {
        async createSchedule(schedule) {
            return await db.insertInto('courier_schedule')
                .values(schedule)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async getSchedules(options: GetSchedulesOptions) {
            let query = db.selectFrom('courier_schedule');

            if (options.courier_id !== undefined) {
                query = query.where('courier_id', '=', options.courier_id);
            }
            if (options.status) {
                query = query.where('status', '=', options.status);
        }
            if (options.from_date) {
                query = query.where('start_datetime', '>=', options.from_date);
            }
            if (options.to_date) {
                query = query.where('end_datetime', '<=', options.to_date);
            }
            if (options.offset !== undefined) {
                query = query.offset(options.offset);
            }
            if (options.limit !== undefined) {
                query = query.limit(options.limit);
            }

            const schedules = await query.selectAll().execute();

            const countResult = await db.selectFrom('courier_schedule')
                .select(({ fn }) => [fn.countAll().as('count')])
                .executeTakeFirst();
            const total = Number(countResult?.count ?? 0);

            return { schedules, total };
        },
        async getScheduleById(id: number) {
            return await db.selectFrom('courier_schedule')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
        },
        async updateSchedule(id: number, schedule: UpdateableCourierScheduleRow) {
            return await db.updateTable('courier_schedule')
                .set(schedule)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async deleteSchedule(id: number) {
            await db.deleteFrom('courier_schedule')
                .where('id', '=', id)
                .execute();
        },
        async getPersonalSchedules(courierId: number, fromDate?: Date, toDate?: Date) {
            let query = db.selectFrom('courier_schedule')
                .selectAll()
                .where('courier_id', '=', courierId);

            if (fromDate) {
                query = query.where('start_datetime', '>=', fromDate);
            }
            if (toDate) {
                query = query.where('end_datetime', '<=', toDate);
            }

            return await query.execute();
        }
    };
}