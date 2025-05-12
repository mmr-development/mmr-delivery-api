import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface PostalCodeTable {
    id: Generated<number>;
    code: string;
    city_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type PostalCodeRow = Selectable<PostalCodeTable>;
export type InsertablePostalCodeRow = Insertable<PostalCodeTable>;
export type UpdateablePostalCodeRow = Updateable<PostalCodeTable>;
