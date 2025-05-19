export interface PartnerCatalog {
    id: number;
    name: string;
    partner_id: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    categories: CatalogCategoryWithItems[];
}
