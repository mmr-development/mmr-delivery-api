import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CatalogItemTable {
    id: Generated<number>;
    name: string;
    description: string;
    price: number;
    image_url: string;
    index: number;
    catalog_category_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CatalogItemRow = Selectable<CatalogItemTable>;
export type InsertableCatalogItemRow = Insertable<CatalogItemTable>;
export type UpdateableCatalogItemRow = Updateable<CatalogItemTable>;

