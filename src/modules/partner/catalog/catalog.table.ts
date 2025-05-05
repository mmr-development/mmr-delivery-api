import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CatalogTable {
    id: Generated<number>;
    name: string;
    partner_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CatalogRow = Selectable<CatalogTable>;
export type InsertableCatalogRow = Insertable<CatalogTable>;
export type UpdateableCatalogRow = Updateable<CatalogTable>;
