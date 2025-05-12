import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CountryTable {
    id: Generated<number>;
    name: string;
    iso: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CountryRow = Selectable<CountryTable>;
export type InsertableCountryRow = Insertable<CountryTable>;
export type UpdateableCountryRow = Updateable<CountryTable>;
