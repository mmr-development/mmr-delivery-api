import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { InsertableHourPreferenceRow, UpdateableHourPreferenceRow, HourPreferenceRow } from './hours-preference.table';

export interface HourPreferenceRepository {
    create(preference: InsertableHourPreferenceRow): Promise<HourPreferenceRow>;
    findAll(): Promise<HourPreferenceRow[] | undefined>;
    findById(id: number): Promise<HourPreferenceRow | undefined>;
    update(id: number, preference: UpdateableHourPreferenceRow): Promise<HourPreferenceRow>;
    delete(id: number): Promise<void>;
}

export function createHourPreferenceRepository(db: Kysely<Database>): HourPreferenceRepository {
    return {
        async create(preference: InsertableHourPreferenceRow): Promise<HourPreferenceRow> {
            const insertedPreference = await db.insertInto('hour_preference')
                .values(preference)
                .returningAll()
                .executeTakeFirstOrThrow();

            return insertedPreference;
        },
        async findAll(): Promise<HourPreferenceRow[] | undefined> {
            const preferences = await db.selectFrom('hour_preference')
                .selectAll()
                .execute();

            return preferences;
        },
        async findById(id: number): Promise<HourPreferenceRow | undefined> {
            const preference = await db.selectFrom('hour_preference')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();

            return preference;
        },
        async update(id: number, preference: UpdateableHourPreferenceRow): Promise<HourPreferenceRow> {
            const updatedPreference = await db.updateTable('hour_preference')
                .set(preference)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return updatedPreference;
        },
        async delete(id: number): Promise<void> {
            await db.deleteFrom('hour_preference')
                .where('id', '=', id)
                .executeTakeFirstOrThrow();
        },
    }
}
