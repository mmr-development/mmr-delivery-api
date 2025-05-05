import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { Catalog, CreateCatalogRequest } from './catalog';
import { CatalogRow } from './catalog.table';
import { CatalogCategory, CreateCatalogCategoryRequest } from './catelog-category';
import { CatalogCategoryRow } from './catalog-category.table';
import { CatalogItem, CreateCatalogItemRequest } from './catalog-item';
import { CatalogItemRow } from './catalog-item.table';

export interface CatalogService {
    createCatalog(partnerId: number, catalog: CreateCatalogRequest): Promise<Catalog>;
    createCatalogCategory(catalogId: number, category: CreateCatalogCategoryRequest): Promise<CatalogCategory>;
    createCatalogItem(catalogCategoryId: number, item: CreateCatalogItemRequest): Promise<CatalogItem>;
}

export function createCatalogService(db: Kysely<Database>): CatalogService {
    return {
        createCatalog: async function (partnerId: number, catalog: CreateCatalogRequest): Promise<Catalog> {
            const createdCatalog = await db
                .insertInto('catalog')
                .values({
                    name: catalog.name,
                    partner_id: partnerId,
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            return catalogRowToCatalog(createdCatalog);
        },
        createCatalogCategory: async function (catalogId: number, category: CreateCatalogCategoryRequest): Promise<CatalogCategory> {
            const createdCategory = await db
                .insertInto('catalog_category')
                .values({
                    name: category.name,
                    catalog_id: catalogId,
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            return catalogCategoryRowToCatalogCategory(createdCategory);
        },
        createCatalogItem: async function (catalogCategoryId: number, item: CreateCatalogItemRequest): Promise<CatalogItem> {
            const createdItem = await db
                .insertInto('catalog_item')
                .values({
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    catalog_category_id: catalogCategoryId,
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            return catalogItemRowToCatalogItem(createdItem);
        },
    };
}

export function catalogRowToCatalog(catalog: CatalogRow): Catalog {
    return {
        id: catalog.id,
        name: catalog.name,
        partner_id: catalog.partner_id,
        created_at: catalog.created_at,
        updated_at: catalog.updated_at,
    };
}

export function catalogCategoryRowToCatalogCategory(category: CatalogCategoryRow): CatalogCategory {
    return {
        id: category.id,
        name: category.name,
        catalog_id: category.catalog_id,
        created_at: category.created_at,
        updated_at: category.updated_at,
    };
}

export function catalogItemRowToCatalogItem(item: CatalogItemRow): CatalogItem {
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        catalog_category_id: item.catalog_category_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
    };
}