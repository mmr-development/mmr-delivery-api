import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CatalogCategoryTable {
    id: Generated<number>;
    name: string;
    index: number;
    catalog_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CatalogCategoryRow = Selectable<CatalogCategoryTable>;
export type InsertableCatalogCategoryRow = Insertable<CatalogCategoryTable>;
export type UpdateableCatalogCategoryRow = Updateable<CatalogCategoryTable>;
