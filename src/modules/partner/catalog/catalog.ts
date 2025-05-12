import { CatalogItem } from "./catalog-item";
import { CatalogCategory } from "./catelog-category";

export interface Catalog {
    id: number;
    name: string;
    partner_id: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreateCatalogRequest {
    name: string;
}
