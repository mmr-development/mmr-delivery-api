import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { Catalog, CreateCatalogRequest } from './catalog';
import { CatalogRow, PartnerCatalogWithRelationships } from './catalog.table';
import { CatalogCategory, CreateCatalogCategoryRequest, PartnerCatalog } from './catelog-category';
import { CatalogCategoryRow } from './catalog-category.table';
import { CatalogItem, CreateCatalogItemRequest } from './catalog-item';
import { CatalogItemRow } from './catalog-item.table';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

export interface CatalogService {
    createCatalog(partnerId: number, catalog: CreateCatalogRequest): Promise<Catalog>;
    findCatalogsByPartnerId(partnerId: number, expand: string[]): Promise<Catalog | undefined>
    findFullCatalogByPartnerId(partnerId: number): Promise<PartnerCatalog>;
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
        findCatalogsByPartnerId: async function (partnerId: number, expand: string[] = []): Promise<any> {
            if (expand.includes('categories') || expand.includes('items')) {
                const catalog = await db
                    .selectFrom('catalog')
                    .where('catalog.partner_id', '=', partnerId)
                    .select(eb => [
                        'catalog.id',
                        'catalog.name',
                        'catalog.partner_id',
                        'catalog.created_at',
                        'catalog.updated_at',
                        ...(expand.includes('categories') ? [
                            jsonArrayFrom(
                                eb.selectFrom('catalog_category')
                                    .select(categoryEb => [
                                        'catalog_category.id',
                                        'catalog_category.name',
                                        'catalog_category.catalog_id',
                                        'catalog_category.created_at',
                                        'catalog_category.updated_at',
                                        ...(expand.includes('items') ? [
                                            jsonArrayFrom(
                                                categoryEb.selectFrom('catalog_item')
                                                    .select([
                                                        'catalog_item.id',
                                                        'catalog_item.name',
                                                        'catalog_item.description',
                                                        'catalog_item.price',
                                                        'catalog_item.catalog_category_id',
                                                        'catalog_item.created_at',
                                                        'catalog_item.updated_at'
                                                    ])
                                                    .where('catalog_item.catalog_category_id', '=', categoryEb.ref('catalog_category.id'))
                                            ).as('items')
                                        ] : [])
                                    ])
                                    .where('catalog_category.catalog_id', '=', eb.ref('catalog.id'))
                            ).as('categories')
                        ] : [])
                    ])
                    .executeTakeFirstOrThrow();

                return catalogRowToPartnerCatalog(catalog);
            }

            const catalog = await db
                .selectFrom('catalog')
                .where('partner_id', '=', partnerId)
                .selectAll()
                .executeTakeFirstOrThrow();

            return catalogRowToCatalog(catalog);
        },
        findFullCatalogByPartnerId: async function (partnerId: number): Promise<PartnerCatalog> {
            const catalog = await db
                .selectFrom('catalog')
                .where('catalog.partner_id', '=', partnerId)
                .select(eb => [
                    'catalog.id',
                    'catalog.name',
                    'catalog.partner_id',
                    'catalog.created_at',
                    'catalog.updated_at',
                    jsonArrayFrom(
                        eb.selectFrom('catalog_category')
                            .select(categoryEb => [
                                'catalog_category.id',
                                'catalog_category.name',
                                'catalog_category.catalog_id',
                                'catalog_category.created_at',
                                'catalog_category.updated_at',

                                // Get items for each category as a nested JSON array
                                jsonArrayFrom(
                                    categoryEb.selectFrom('catalog_item')
                                        .select([
                                            'catalog_item.id',
                                            'catalog_item.name',
                                            'catalog_item.description',
                                            'catalog_item.price',
                                            'catalog_item.catalog_category_id',
                                            'catalog_item.created_at',
                                            'catalog_item.updated_at'
                                        ])
                                        .where('catalog_item.catalog_category_id', '=', categoryEb.ref('catalog_category.id'))
                                ).as('items')
                            ])
                            .where('catalog_category.catalog_id', '=', eb.ref('catalog.id'))
                    ).as('categories')
                ])
                .executeTakeFirstOrThrow();

            console.log('Catalog with relationships:', catalog);


            return catalogRowToPartnerCatalog(catalog)
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

export function catalogRowToPartnerCatalog(catalog: PartnerCatalogWithRelationships): PartnerCatalog {
    return {
        catalog: [{
            id: catalog.id,
            name: catalog.name,
            categories: Array.isArray(catalog.categories)
                ? catalog.categories.map(category => ({
                    id: category.id,
                    name: category.name,
                    catalog_id: category.catalog_id,
                    items: Array.isArray(category.items)
                        ? category.items.map(item => ({
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            price: item.price,
                            catalog_category_id: item.catalog_category_id,
                        }))
                        : [],
                }))
                : [],
        }]
    }
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