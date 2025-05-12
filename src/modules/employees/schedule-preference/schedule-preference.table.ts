import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface SchedulePreferenceTable {
    id: Generated<number>;
    name: string;
    description: string | null;
    created_at: Generated<Date> | string;
}

export type SchedulePreferenceRow = Selectable<SchedulePreferenceTable>;
export type InsertableSchedulePreferenceRow = Insertable<SchedulePreferenceTable>;
export type UpdateableSchedulePreferenceRow = Updateable<SchedulePreferenceTable>;
