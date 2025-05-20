import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { Catalog, CreateCatalogRequest, PartnerInfo } from './catalog.schema';
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
import { BulkCategory } from './catalog-category.schema';

export interface CatalogService {
    createCatalog(partnerId: number, catalog: CreateCatalogRequest): Promise<Catalog>;
    updateCatalog(catalogId: number, catalog: UpdateableCatalogRow): Promise<Catalog>;
    deleteCatalog(catalogId: number): Promise<void>;
    findCatalogsByPartnerId(partnerId: number): Promise<Catalog[]>; // Change to array
    findFullCatalogsByPartnerId(partnerId: number, options?: { includeInactive?: boolean }): Promise<{
        partner: PartnerInfo;
        catalogs: Omit<PartnerCatalog, 'partner'>[];
    }>;
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
    uploadCatalogItemImage(catalogId: number, filename: string, buffer: Buffer): Promise<string>;
    bulkCreateCategoriesWithItems(catalogId: number, categories: BulkCategory[]): Promise<{ categories: any[] }>;
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
        findFullCatalogsByPartnerId: async function (partnerId: number, options?: { includeInactive?: boolean }): Promise<{
            partner: PartnerInfo;
            catalogs: Omit<PartnerCatalog, 'partner'>[];
        }> {
            // Create query builder that gets all catalogs with partner information
            const catalogs = await db
                .selectFrom('catalog')
                .innerJoin('partner', 'catalog.partner_id', 'partner.id')
                .where('catalog.partner_id', '=', partnerId)
                .select(eb => [
                    'catalog.id',
                    'catalog.name',
                    'catalog.description', // Added description field
                    'catalog.partner_id',
                    'catalog.is_active',
                    'catalog.created_at',
                    'catalog.updated_at',
                    // Select partner information
                    'partner.name as partner_name',
                    'partner.logo_url',
                    'partner.banner_url',
                    'partner.phone_number',
                    'partner.delivery_fee',
                    'partner.min_order_value',
                    'partner.max_delivery_distance_km',
                    'partner.min_preparation_time_minutes',
                    'partner.max_preparation_time_minutes',
                    jsonArrayFrom(
                        eb.selectFrom('catalog_category')
                            .select(categoryEb => [
                                'catalog_category.id',
                                'catalog_category.name',
                                'catalog_category.catalog_id',
                                'catalog_category.index',
                                'catalog_category.created_at',
                                'catalog_category.updated_at',
                                jsonArrayFrom(
                                    categoryEb.selectFrom('catalog_item')
                                        .select([
                                            'catalog_item.id',
                                            'catalog_item.name',
                                            'catalog_item.description',
                                            'catalog_item.price',
                                            'catalog_item.image_url',
                                            'catalog_item.catalog_category_id',
                                            'catalog_item.index',
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

            // Return early with empty arrays if no catalogs found
            if (catalogs.length === 0) {
                return {
                    partner: {
                        name: '',
                        logo_url: '',
                        banner_url: '',
                        phone_number: '',
                        delivery_fee: 0,
                        min_order_value: 0,
                        max_delivery_distance_km: 0,
                        min_preparation_time_minutes: 0,
                        max_preparation_time_minutes: 0
                    },
                    catalogs: []
                };
            }

            // Extract partner info from the first catalog item (all should have the same partner info)
            const partnerInfo: PartnerInfo = {
                name: catalogs[0].partner_name || '',
                logo_url: catalogs[0].logo_url || '',
                banner_url: catalogs[0].banner_url || '',
                phone_number: catalogs[0].phone_number || '',
                delivery_fee: Number(catalogs[0].delivery_fee) || 0,
                min_order_value: Number(catalogs[0].min_order_value) || 0,
                max_delivery_distance_km: Number(catalogs[0].max_delivery_distance_km) || 0,
                min_preparation_time_minutes: Number(catalogs[0].min_preparation_time_minutes) || 0,
                max_preparation_time_minutes: Number(catalogs[0].max_preparation_time_minutes) || 0
            };

            // Map catalogs without partner info
            const formattedCatalogs = catalogs.map(catalog => ({
                id: catalog.id,
                name: catalog.name,
                description: catalog.description || '', // Added description field
                partner_id: catalog.partner_id,
                is_active: catalog.is_active,
                created_at: catalog.created_at,
                updated_at: catalog.updated_at,
                categories: Array.isArray(catalog.categories)
                    ? catalog.categories.map(category => ({
                        id: category.id,
                        name: category.name,
                        catalog_id: category.catalog_id,
                        index: category.index,
                        created_at: category.created_at,
                        updated_at: category.updated_at,
                        items: Array.isArray(category.items)
                            ? category.items.map(item => ({
                                id: item.id,
                                name: item.name,
                                description: item.description,
                                price: Number(item.price),
                                catalog_category_id: item.catalog_category_id,
                                image_url: item.image_url,
                                index: item.index, // Added missing index field here
                                created_at: item.created_at,
                                updated_at: item.updated_at
                            }))
                            : [],
                    }))
                    : []
            }));

            return {
                partner: partnerInfo,
                catalogs: formattedCatalogs
            };
        },
        createCatalogCategory: async function (catalogId: number, category: CreateCatalogCategoryRequest): Promise<CatalogCategory> {
            const maxIndex = await db
                .selectFrom('catalog_category')
                .where('catalog_id', '=', catalogId)
                .select(eb => eb.fn.max('index').as('maxIndex'))
                .executeTakeFirst();

            const nextIndex = (maxIndex?.maxIndex ?? -1) + 1;

            const createdCategory = await db
                .insertInto('catalog_category')
                .values({
                    name: category.name,
                    catalog_id: catalogId,
                    index: nextIndex,
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
            // First, get the current category to determine its catalog_id
            const currentCategory = await db
                .selectFrom('catalog_category')
                .where('id', '=', categoryId)
                .selectAll()
                .executeTakeFirstOrThrow();

            // Create an update object with all provided fields
            const updateData: Partial<CatalogCategoryRow> = {
                name: category.name,
            };

            // If index is being updated, handle the shifting
            if (typeof category.index === 'number') {
                // 1. Fetch all categories for this catalog ordered by index
                const categories = await db
                    .selectFrom('catalog_category')
                    .selectAll()
                    .where('catalog_id', '=', currentCategory.catalog_id)
                    .orderBy('index', 'asc')
                    .execute();

                // 2. Find the current index of the category
                const currentIndex = categories.findIndex(cat => cat.id === categoryId);
                if (currentIndex === -1) throw new Error('Category not found');

                // Get the target index, ensuring it's within bounds
                const newIndex = Math.max(0, Math.min(category.index, categories.length - 1));

                // 3. Do the shift
                const itemToMove = categories.splice(currentIndex, 1)[0];
                categories.splice(newIndex, 0, itemToMove);

                // 4. Update positions in a transaction
                await db.transaction().execute(async (trx) => {
                    for (let i = 0; i < categories.length; i++) {
                        await trx
                            .updateTable('catalog_category')
                            .set({ index: i })
                            .where('id', '=', categories[i].id)
                            .execute();
                    }
                });

                // Set the index in the update data to the new index
                updateData.index = newIndex;
            }

            // Update the category
            const updatedCategory = await db
                .updateTable('catalog_category')
                .set(updateData)
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
            const maxIndex = await db
                .selectFrom('catalog_item')
                .where('catalog_category_id', '=', catalogCategoryId)
                .select(eb => eb.fn.max('index').as('maxIndex'))
                .executeTakeFirst();

            const nextIndex = (maxIndex?.maxIndex ?? -1) + 1;


            const createdItem = await db
                .insertInto('catalog_item')
                .values({
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image_url: '',
                    catalog_category_id: catalogCategoryId,
                    index: nextIndex,
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
            // First, get the current item to determine its catalog_category_id
            const currentItem = await db
                .selectFrom('catalog_item')
                .where('id', '=', itemId)
                .selectAll()
                .executeTakeFirstOrThrow();

            // Create an update object with all provided fields
            const updateData: Partial<CatalogItemRow> = {
                name: item.name,
                description: item.description,
                price: item.price,
            };

            // If index is being updated, handle the shifting
            if (typeof item.index === 'number') {
                // 1. Fetch all items for this category ordered by index
                const items = await db
                    .selectFrom('catalog_item')
                    .selectAll()
                    .where('catalog_category_id', '=', currentItem.catalog_category_id)
                    .orderBy('index', 'asc')
                    .execute();

                // 2. Find the current index of the item
                const currentIndex = items.findIndex(itm => itm.id === itemId);
                if (currentIndex === -1) throw new Error('Item not found');

                // Get the target index, ensuring it's within bounds
                const newIndex = Math.max(0, Math.min(item.index, items.length - 1));

                // 3. Do the shift
                const itemToMove = items.splice(currentIndex, 1)[0];
                items.splice(newIndex, 0, itemToMove);

                // 4. Update positions in a transaction
                await db.transaction().execute(async (trx) => {
                    for (let i = 0; i < items.length; i++) {
                        await trx
                            .updateTable('catalog_item')
                            .set({ index: i })
                            .where('id', '=', items[i].id)
                            .execute();
                    }
                });

                // Set the index in the update data to the new index
                updateData.index = newIndex;
            }

            // Update the item
            const updatedItem = await db
                .updateTable('catalog_item')
                .set(updateData)
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
        findCatalogItemPrice: async function (itemId: number): Promise<number | null> {
            const item = await db
                .selectFrom('catalog_item')
                .where('catalog_item.id', '=', itemId)
                .select(['price'])
                .executeTakeFirst();

            return item ? Number(item.price) : null;
        },
        async uploadCatalogItemImage(catalogId: number, filename: string, buffer: Buffer): Promise<string> {
            const item = await this.findCatalogItemById(catalogId);
            if (!item) {
                throw new Error(`Catalog item with ID ${catalogId} not found`);
            }

            // Create directory structure if it doesn't exist
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'catalog-items');

            try {
                await fs.mkdir(uploadDir, { recursive: true });
            } catch (err) {
                // Directory already exists or cannot be created
                console.error('Failed to create directory:', err);
                throw new Error('Failed to create upload directory');
            }

            // Generate a unique filename
            const fileExtension = path.extname(filename);
            const uniqueFilename = `catalog-item-${catalogId}-${Date.now()}${fileExtension}`;
            const filePath = path.join(uploadDir, uniqueFilename);

            // Save the file
            await fs.writeFile(filePath, buffer);

            // Generate URL for the image
            const imageUrl = `/uploads/catalog-items/${uniqueFilename}`;

            // Update the catalog item with the image URL
            await db
                .updateTable('catalog_item')
                .set({ image_url: imageUrl })
                .where('id', '=', catalogId)
                .execute();

            return imageUrl;
        },
        // Add this method to your CatalogService interface and implementation

        async bulkCreateCategoriesWithItems(catalogId: number, categories: BulkCategory[]): Promise<{ categories: any[] }> {
            // Create an array to hold all created categories with their items
            const createdCategories: Array<CatalogCategoryRow & { items: CatalogItemRow[] }> = [];

            // Use a transaction to ensure all operations succeed or fail together
            return db.transaction().execute(async (trx) => {
                for (const category of categories) {
                    // Create the category
                    const createdCategory = await trx
                        .insertInto('catalog_category')
                        .values({
                            catalog_id: catalogId,
                            name: category.name,
                            index: category.index,
                            created_at: new Date(),
                            updated_at: new Date()
                        })
                        .returningAll()
                        .executeTakeFirstOrThrow();

                    // Add items if they exist
                    const createdItems = [];
                    if (category.items && category.items.length > 0) {
                        for (let i = 0; i < category.items.length; i++) {
                            const item = category.items[i];
                            const createdItem = await trx
                                .insertInto('catalog_item')
                                .values({
                                    catalog_category_id: createdCategory.id,
                                    name: item.name,
                                    description: item.description || '',
                                    price: item.price,
                                    image_url: '',
                                    index: item.index !== undefined ? item.index : i, // Use provided index or position as fallback
                                    created_at: new Date(),
                                    updated_at: new Date()
                                })
                                .returningAll()
                                .executeTakeFirstOrThrow();

                            createdItems.push(createdItem);
                        }
                    }

                    // Create a new object combining category with its items
                    const categoryWithItems = {
                        ...createdCategory,
                        items: createdItems
                    };
                    createdCategories.push(categoryWithItems as CatalogCategoryRow & { items: CatalogItemRow[] });
                }

                return { categories: createdCategories };
            });
        }
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
        index: category.index,
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
        index: item.index,
        created_at: item.created_at,
        updated_at: item.updated_at,
    };
}