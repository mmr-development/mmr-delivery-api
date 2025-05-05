
export interface CatalogItem {
    id: number;
    name: string;
    catalog_category_id: number;
    description: string;
    price: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreateCatalogItemRequest {
    name: string;
    description: string;
    price: number;
    catalog_category_id: number;
}
