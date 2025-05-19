import { FastifyPluginAsync } from 'fastify';
import { CatalogService } from './catalog.service';
import { CreateCatalogRequest, createCatalogSchema, getFullCatalogSchema, deleteCatalogByCatalogIdSchema, updateCatalogSchema, UpdateCatalogRequest } from './catalog.schema';
import { BulkCategoriesRequest, bulkCreateCategoriesSchema, CreateCategoryRequest, createCategorySchema, deleteCategorySchema, getCategoriesSchema, getCategorySchema, UpdateCategoryRequest, updateCategorySchema } from './catalog-category.schema';
import { CreateCatalogItemRequest } from './catalog-item';
import { createItemSchema, deleteItemSchema, getItemSchema, getItemsSchema, updateItemSchema } from './catalog-item.schema';

export interface CatalogControllerOptions {
    catalogService: CatalogService
}

export const catalogController: FastifyPluginAsync<CatalogControllerOptions> = async function (server, { catalogService }) {
    server.post<{ Body: CreateCatalogRequest, Params: { partner_id: number } }>(
        '/partners/:partner_id/catalogs/',
        { schema: { ...createCatalogSchema } },
        async (request, reply) => {
            const catalog = await catalogService.createCatalog(request.params.partner_id, request.body);
            return reply.code(201).send(catalog);
        });

    server.get<{ Params: { partner_id: number } }>(
        '/partners/:partner_id/catalogs/full/',
        { schema: getFullCatalogSchema },
        async (request, reply) => {
            const { partner_id } = request.params;
            const result = await catalogService.findFullCatalogsByPartnerId(partner_id);

            return {
              partner: result.partner,
              catalogs: result.catalogs
            };
        });

    server.patch<{ Params: { catalog_id: number }, Body: UpdateCatalogRequest }>(
        '/partners/:partner_id/catalogs/:catalog_id/',
        { schema: { ...updateCatalogSchema } },
        async (request, reply) => {
            const catalog = await catalogService.updateCatalog(request.params.catalog_id, request.body);
            return reply.code(200).send(catalog);
        });

    server.delete<{ Params: { catalog_id: number } }>(
        '/partners/:partner_id/catalogs/:catalog_id/',
        { schema: { ...deleteCatalogByCatalogIdSchema } },
        async (request, reply) => {
            await catalogService.deleteCatalog(request.params.catalog_id);
            return reply.code(204).send();
        });

    server.post<{ Body: BulkCategoriesRequest, Params: { catalog_id: number } }>(
        '/catalog/:catalog_id/bulk-categories/',
        { schema: { ...bulkCreateCategoriesSchema, tags: ['Partner Catalogs'] } },
        async (request, reply) => {
            const result = await catalogService.bulkCreateCategoriesWithItems(
                request.params.catalog_id,
                request.body.categories
            );
            return reply.code(201).send(result);
        }
    );

    server.post<{ Body: CreateCategoryRequest, Params: { catalog_id: number } }>('/catalog/:catalog_id/categories/', { schema: { ...createCategorySchema } }, async (request, reply) => {
        const category = await catalogService.createCatalogCategory(request.params.catalog_id, request.body);
        return reply.code(201).send(category);
    });

    server.post<{ Params: { catalog_id: number } }>('/catalog/:catalog_id/upload-menu-image/', {
        schema: {
            summary: 'Upload a menu image for the catalog',
            tags: ['Partner Catalogs'],
            params: {
                type: 'object',
                required: ['catalog_id'],
                properties: {
                    catalog_id: { type: 'number' }
                }
            },
            consumes: ['multipart/form-data'],
            response: {
                201: {
                    type: 'object',
                    properties: {
                        imageUrl: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }

            // Check file type
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedMimeTypes.includes(data.mimetype)) {
                return reply.code(400).send({
                    message: 'Invalid file type. Only JPG, JPEG, and PNG are allowed.'
                });
            }

            // Process the file using your service
            const imageUrl = await catalogService.uploadMenuImage(
                request.params.catalog_id,
                data.filename,
                await data.toBuffer()
            );

            return reply.code(201).send({ imageUrl });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Failed to upload image' });
        }
    });

    server.get<{ Params: { catalog_id: number } }>('/catalog/:catalog_id/categories', { schema: { ...getCategoriesSchema } }, async (request, reply) => {
        const categories = await catalogService.findAllCatalogCategoriesByCatalogId(request.params.catalog_id);
        return reply.code(200).send({ categories });
    });

    server.patch<{ Params: { category_id: number }, Body: UpdateCategoryRequest }>(
        '/catalog/categories/:category_id/',
        { schema: { ...updateCategorySchema } },
        async (request, reply) => {
            const category = await catalogService.updateCatalogCategory(request.params.category_id, request.body);
            return reply.code(200).send(category);
        });

    server.delete<{ Params: { category_id: number } }>('/catalog/categories/:category_id/', { schema: { ...deleteCategorySchema } }, async (request, reply) => {
        await catalogService.deleteCatalogCategory(request.params.category_id);
        return reply.code(204).send();
    });

    server.post<{ Body: CreateCatalogItemRequest, Params: { category_id: number } }>('/categories/:category_id/items/', { schema: { ...createItemSchema } }, async (request, reply) => {
        const item = await catalogService.createCatalogItem(request.params.category_id, request.body);
        return reply.code(201).send(item);
    });

    server.get<{ Params: { category_id: number } }>('/categories/:category_id/items/', { schema: { ...getItemsSchema } }, async (request, reply) => {
        const items = await catalogService.findAllCatalogItemsByCategoryId(request.params.category_id);
        return reply.code(200).send({ items });
    });

    server.get<{ Params: { item_id: number } }>('/categories/items/:item_id/', { schema: { ...getItemSchema } }, async (request, reply) => {
        const item = await catalogService.findCatalogItemById(request.params.item_id);
        return reply.code(200).send(item);
    });

    server.post<{ Params: { item_id: number } }>('/categories/items/:item_id/upload-image/', {
        schema: {
            tags: ['Partner Catalogs'],
            summary: 'Upload an image for a catalog item',
            consumes: ['multipart/form-data'],
            response: {
                201: {
                    type: 'object',
                    properties: {
                        imageUrl: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }

            // Check file type
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedMimeTypes.includes(data.mimetype)) {
                return reply.code(400).send({
                    message: 'Invalid file type. Only JPG, JPEG, and PNG are allowed.'
                });
            }

            // Process the file using your service
            const imageUrl = await catalogService.uploadCatalogItemImage(
                request.params.item_id,
                data.filename,
                await data.toBuffer()
            );

            // Return JSON object with imageUrl property
            return reply.code(201).send({ imageUrl });
        } catch (error) {
            // Add proper error handling
            request.log.error(error);
            return reply.code(500).send({
                message: error instanceof Error ? error.message : 'Failed to upload image'
            });
        }
    });

    // patch to update category item
    server.patch<{ Params: { item_id: number }, Body: CreateCatalogItemRequest }>(
        '/categories/items/:item_id/',
        { schema: { ...updateItemSchema } },
        async (request, reply) => {
            const item = await catalogService.updateCategoryItem(request.params.item_id, request.body);
            return reply.code(200).send(item);
        });

    server.delete<{ Params: { item_id: number } }>('/categories/items/:item_id/', { schema: { ...deleteItemSchema } }, async (request, reply) => {
        await catalogService.deleteCategoryItem(request.params.item_id);
        return reply.code(204).send();
    });
};