import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface StreetTable {
    id: Generated<number>;
    name: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type StreetRow = Selectable<StreetTable>;
export type InsertableStreetRow = Insertable<StreetTable>;
export type UpdateableStreetRow = Updateable<StreetTable>;
