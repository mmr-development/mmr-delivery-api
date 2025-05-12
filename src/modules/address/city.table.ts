import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CityTable {
    id: Generated<number>;
    name: string;
    country_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CityRow = Selectable<CityTable>;
export type InsertableCityRow = Insertable<CityTable>;
export type UpdateableCityRow = Updateable<CityTable>;
