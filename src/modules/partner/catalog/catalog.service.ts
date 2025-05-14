import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { Catalog, CreateCatalogRequest, UpdateCatalogRequest } from './catalog.schema';
import { CatalogRow, PartnerCatalogWithRelationships, UpdateableCatalogRow } from './catalog.table';
import { CatalogCategory, CreateCatalogCategoryRequest, PartnerCatalog } from './catalog-category';
import { CatalogCategoryRow } from './catalog-category.table';
import { CatalogItem, CreateCatalogItemRequest } from './catalog-item';
import { CatalogItemRow } from './catalog-item.table';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { UpdateCatalogCategoryRequest } from './catalog.schema';
import { UpdateItemRequest } from './catalog-item.schema';
import { promises as fs } from 'fs';
import path from 'path';

export interface CatalogService {
    createCatalog(partnerId: number, catalog: CreateCatalogRequest): Promise<Catalog>;
    updateCatalog(catalogId: number, catalog: UpdateableCatalogRow): Promise<Catalog>;
    deleteCatalog(catalogId: number): Promise<void>;
    findCatalogsByPartnerId(partnerId: number): Promise<Catalog[]>; // Change to array
    findFullCatalogsByPartnerId(partnerId: number, options?: {includeInactive?: boolean}): Promise<PartnerCatalog[]>; // Changed to array
    createCatalogCategory(catalogId: number, category: CreateCatalogCategoryRequest): Promise<CatalogCategory>;
    findAllCatalogCategoriesByCatalogId(catalogId: number): Promise<CatalogCategory[]>;
    updateCatalogCategory(categoryId: number, category: UpdateCatalogCategoryRequest): Promise<CatalogCategory>;
    deleteCatalogCategory(categoryId: number): Promise<void>;
    createCatalogItem(catalogCategoryId: number, item: CreateCatalogItemRequest): Promise<CatalogItem>;
    findAllCatalogItemsByCategoryId(catalogCategoryId: number): Promise<CatalogItem[]>;
    findCatalogItemById(itemId: number): Promise<CatalogItem | null>;
    updateCategoryItem(itemId: number, item: UpdateItemRequest): Promise<CatalogItem>;
    deleteCategoryItem(itemId: number): Promise<void>;
    uploadMenuImage(catalogId: number, filename: string, buffer: Buffer): Promise<string>;
    findCatalogItemPrice(itemId: number): Promise<number | null>;
}

export function createCatalogService(db: Kysely<Database>): CatalogService {
    return {
        createCatalog: async function (partnerId: number, catalog: CreateCatalogRequest): Promise<Catalog> {
            const createdCatalog = await db
                .insertInto('catalog')
                .values({
                    name: catalog.name,
                    partner_id: partnerId,
                    is_active: catalog.is_active ?? true, // Default to true if not provided
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            return catalogRowToCatalog(createdCatalog);
        },
        updateCatalog: async function (catalogId: number, catalog: UpdateableCatalogRow): Promise<Catalog> {
            const updatedCatalog = await db
                .updateTable('catalog')
                .set({
                    name: catalog.name,
                    is_active: catalog.is_active,
                })
                .where('id', '=', catalogId)
                .returningAll()
                .executeTakeFirstOrThrow();

            return catalogRowToCatalog(updatedCatalog);
        },
        deleteCatalog: async function (catalogId: number): Promise<void> {
            await db
                .deleteFrom('catalog')
                .where('id', '=', catalogId)
                .execute();
        },
        findCatalogsByPartnerId: async function (partnerId: number): Promise<Catalog[]> { // Update return type
            const catalogs = await db
                .selectFrom('catalog')
                .where('catalog.partner_id', '=', partnerId)
                .selectAll()
                .execute();
            return catalogs.map(catalogRowToCatalog);
        },
        findFullCatalogsByPartnerId: async function (partnerId: number): Promise<PartnerCatalog[]> {
            // Create query builder that gets all catalogs
            const catalogs = await db
                .selectFrom('catalog')
                .where('catalog.partner_id', '=', partnerId)
                .select(eb => [
                    'catalog.id',
                    'catalog.name',
                    'catalog.partner_id',
                    'catalog.is_active', 
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
                .execute();
            
            // Map and return all catalogs
            return catalogs.map(catalog => catalogRowToPartnerCatalog(catalog));
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
        findAllCatalogCategoriesByCatalogId: async function (catalogId: number): Promise<CatalogCategory[]> {
            const categories = await db
                .selectFrom('catalog_category')
                .where('catalog_category.catalog_id', '=', catalogId)
                .selectAll()
                .execute();

            return categories.map(catalogCategoryRowToCatalogCategory);
        },
        updateCatalogCategory: async function (categoryId: number, category: UpdateCatalogCategoryRequest): Promise<CatalogCategory> {
            const updatedCategory = await db
                .updateTable('catalog_category')
                .set({
                    name: category.name,
                })
                .where('id', '=', categoryId)
                .returningAll()
                .executeTakeFirstOrThrow();

            return catalogCategoryRowToCatalogCategory(updatedCategory);
        },
        deleteCatalogCategory: async function (categoryId: number): Promise<void> {
            await db
                .deleteFrom('catalog_category')
                .where('id', '=', categoryId)
                .execute();
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
        findAllCatalogItemsByCategoryId: async function (catalogCategoryId: number): Promise<CatalogItem[]> {
            const items = await db
                .selectFrom('catalog_item')
                .where('catalog_item.catalog_category_id', '=', catalogCategoryId)
                .selectAll()
                .execute();

            return items.map(catalogItemRowToCatalogItem);
        },
        findCatalogItemById: async function (itemId: number): Promise<CatalogItem | null> {
            const item = await db
                .selectFrom('catalog_item')
                .where('catalog_item.id', '=', itemId)
                .selectAll()
                .executeTakeFirst();

            return item ? catalogItemRowToCatalogItem(item) : null;
        },
        updateCategoryItem: async function (itemId: number, item: UpdateItemRequest): Promise<CatalogItem> {
            const updatedItem = await db
                .updateTable('catalog_item')
                .set({
                    name: item.name,
                    description: item.description,
                    price: item.price,
                })
                .where('id', '=', itemId)
                .returningAll()
                .executeTakeFirstOrThrow();

            return catalogItemRowToCatalogItem(updatedItem);
        },
        deleteCategoryItem: async function (itemId: number): Promise<void> {
            await db
                .deleteFrom('catalog_item')
                .where('id', '=', itemId)
                .execute();
        },
        async uploadMenuImage(catalogId: number, filename: string, buffer: Buffer): Promise<string> {
            // Create directory structure if it doesn't exist
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'menus');
            
            try {
                await fs.mkdir(uploadDir, { recursive: true });
            } catch (err) {
                // Directory already exists or cannot be created
                console.error('Failed to create directory:', err);
                throw new Error('Failed to create upload directory');
            }
        
            // Generate a unique filename
            const fileExtension = path.extname(filename);
            const uniqueFilename = `catalog-${catalogId}-${Date.now()}${fileExtension}`;
            const filePath = path.join(uploadDir, uniqueFilename);
            
            // Save the file
            await fs.writeFile(filePath, buffer);
            return `/uploads/menus/${uniqueFilename}`;
        },
        findCatalogItemPrice: async function(itemId: number): Promise<number | null> {
            const item = await db
                .selectFrom('catalog_item')
                .where('catalog_item.id', '=', itemId)
                .select(['price'])
                .executeTakeFirst();
                
            return item ? Number(item.price) : null;
        },
    };
}

export function catalogRowToPartnerCatalog(catalog: PartnerCatalogWithRelationships): PartnerCatalog {
    return {
        id: catalog.id,
        name: catalog.name,
        partner_id: catalog.partner_id,
        is_active: catalog.is_active,
        created_at: catalog.created_at,
        updated_at: catalog.updated_at,
        categories: Array.isArray(catalog.categories)
            ? catalog.categories.map(category => ({
                id: category.id,
                name: category.name,
                catalog_id: category.catalog_id,
                created_at: category.created_at, // Ensure this is included
                updated_at: category.updated_at, // Ensure this is included
                items: Array.isArray(category.items)
                    ? category.items.map(item => ({
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        price: Number(item.price),
                        catalog_category_id: item.catalog_category_id,
                        // image_url: item.image_url,
                        created_at: item.created_at, // Ensure this is included
                        updated_at: item.updated_at  // Ensure this is included
                    }))
                    : [],
            }))
            : []
    };
}

export function catalogRowToCatalog(catalog: CatalogRow): Catalog {
    return {
        id: catalog.id,
        name: catalog.name,
        partner_id: catalog.partner_id,
        is_active: catalog.is_active,
        // created_at: catalog.created_at,
        // updated_at: catalog.updated_at,
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