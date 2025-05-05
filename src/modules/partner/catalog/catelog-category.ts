
export interface CatalogCategory {
    id: number;
    name: string;
    catalog_id: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreateCatalogCategoryRequest {
    name: string;
}
