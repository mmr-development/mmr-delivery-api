import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CatalogTable {
    id: Generated<number>;
    name: string;
    partner_id: number;
    is_active: boolean;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export interface CatalogItemWithDetails {
    id: number;
    name: string;
    description: string;
    price: string | number;
    catalog_category_id: number;
    image_url: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CatalogCategoryWithItems {
    id: number;
    name: string;
    catalog_id: number;
    created_at: Date;
    updated_at: Date;
    items: CatalogItemWithDetails[];
}

export interface PartnerCatalogWithRelationships extends CatalogRow {
    categories?: any[];
    // Partner fields
    partner_name?: string;
    logo_url?: string;
    banner_url?: string;
    phone_number?: string;
    delivery_fee?: number | string;
    min_order_value?: number | string;
    max_delivery_distance_km?: number | string;
}

export type CatalogRow = Selectable<CatalogTable>;
export type InsertableCatalogRow = Insertable<CatalogTable>;
export type UpdateableCatalogRow = Updateable<CatalogTable>;
