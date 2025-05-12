import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface HourPreferenceTable {
    id: Generated<number>;
    name: string;
    description: string | null;
    created_at: Generated<Date>;
}

export type HourPreferenceRow = Selectable<HourPreferenceTable>;
export type InsertableHourPreferenceRow = Insertable<HourPreferenceTable>;
export type UpdateableHourPreferenceRow = Updateable<HourPreferenceTable>;
