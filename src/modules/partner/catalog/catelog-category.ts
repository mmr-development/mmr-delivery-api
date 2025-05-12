
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

export interface PartnerCatalog {
    catalog: {
        id: number;
        name: string;
        // created_at: Date;
        // updated_at: Date;
        categories: {
            id: number;
            name: string;
            catalog_id: number;
            // created_at: Date;
            // updated_at: Date;
            items: {
                id: number;
                name: string;
                description: string;
                price: string | number;
                catalog_category_id: number;
                // created_at: Date;
                // updated_at: Date;
            }[];
        }[];
    }[];
}
