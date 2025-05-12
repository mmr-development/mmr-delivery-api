import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { InsertableSchedulePreferenceRow, UpdateableSchedulePreferenceRow, SchedulePreferenceRow } from './schedule-preference.table';

export interface SchedulePreferenceRepository {
    create(preference: InsertableSchedulePreferenceRow): Promise<SchedulePreferenceRow>;
    findAll(): Promise<SchedulePreferenceRow[] | undefined>;
    findById(id: number): Promise<SchedulePreferenceRow | undefined>;
    update(id: number, preference: UpdateableSchedulePreferenceRow): Promise<SchedulePreferenceRow>;
    delete(id: number): Promise<void>;
}

export function createSchedulePreferenceRepository(db: Kysely<Database>): SchedulePreferenceRepository {
    return {
        async create(preference: InsertableSchedulePreferenceRow): Promise<SchedulePreferenceRow> {
            const insertedPreference = await db.insertInto('schedule_preference')
                .values(preference)
                .returningAll()
                .executeTakeFirstOrThrow();

            return insertedPreference;
        },
        async findAll(): Promise<SchedulePreferenceRow[] | undefined> {
            const preferences = await db.selectFrom('schedule_preference')
                .selectAll()
                .execute();

            return preferences;
        },
        async findById(id: number): Promise<SchedulePreferenceRow | undefined> {
            const preference = await db.selectFrom('schedule_preference')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();

            return preference;
        },
        async update(id: number, preference: UpdateableSchedulePreferenceRow): Promise<SchedulePreferenceRow> {
            const updatedPreference = await db.updateTable('schedule_preference')
                .set(preference)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return updatedPreference;
        },
        async delete(id: number): Promise<void> {
            await db.deleteFrom('schedule_preference')
                .where('id', '=', id)
                .executeTakeFirstOrThrow();
        },
    }
}