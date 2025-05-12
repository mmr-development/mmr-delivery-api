import { FastifyPluginAsync } from 'fastify';
import { DeletePartnerApplicationParams, deletePartnerApplicationSchema, getPartnerApplicationByIdSchema, getPartnerApplicationsSchema, PartnerApplicationResponseSchema, partnerApplicationSchema, PartnerApplicationUpdate, PartnerFilter, PartnerFilterSchema, updatePartnerApplicationSchema } from './partner.schema';
import { PartnerApplicationService } from './partner-application.service';
import { Partner } from './partner';
import { PartnerApplicationRequest } from './partner.schema';
import {
    DeliveryMethodService, CreateDeliveryMethodRequest, createDeliveryMethodSchema,
    getDeliveryMethodsSchema,
    getDeliveryMethodByIdSchema,
    updateDeliveryMethodSchema,
    deleteDeliveryMethodSchema
} from './delivery-method';
import {
    BusinessTypeService, CreateBusinessTypeRequest, createBusinessTypeSchema,
    getBusinessTypesSchema,
    getBusinessTypeByIdSchema,
    updateBusinessTypeSchema,
    deleteBusinessTypeSchema
} from './business-type';
import { ControllerError } from '../../utils/errors';
import { createCatalogSchema, CatalogService, createCatalogCategorySchema, createCatalogItemSchema, getCatalogSchema, GetCatalogsQuerySchema } from './catalog';
import { CreateCatalogCategoryRequest } from './catalog/catelog-category';
import { CreateCatalogItemRequest } from './catalog/catalog-item';
import { EmailAlreadyExistsError } from '../users';
import { PartnerService } from './partner.service';
import { PartnerHourService } from './partner-hour/partner-hour.service';
import { CreatePartnerHourRequest, createPartnerHourSchema, deletePartnerHourSchema, getPartnerHourByIdSchema, getPartnerHoursSchema, UpdatePartnerHourRequest, updatePartnerHourSchema } from './partner-hour/partner-hour.schema';

export interface PartnerControllerOptions {
    partnerApplicationService: PartnerApplicationService;
    deliveryMethodService: DeliveryMethodService;
    businessTypeService: BusinessTypeService;
    catalogService: CatalogService;
    partnerService: PartnerService;
    partnerHourService: PartnerHourService;
}

export const partnerController: FastifyPluginAsync<PartnerControllerOptions> = async function (server, { partnerApplicationService, deliveryMethodService, businessTypeService, catalogService, partnerService, partnerHourService }) {
    server.post<{ Body: PartnerApplicationRequest }>('/partner-applications/', { schema: { ...partnerApplicationSchema } }, async (request, reply) => {
        try {
            await partnerApplicationService.submitApplication(request.body);
            return reply.code(201).send({
                message: 'Partner application submitted successfully',
                status: 201
            })
        } catch (error) {
            if (error instanceof EmailAlreadyExistsError) {
                throw new ControllerError(409, 'EmailAlreadyExists', error.message);
            }
        }
    });

    server.get('/partner-applications/', { schema: { ...getPartnerApplicationsSchema, tags: ['Partner Applications'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const partnerApplications = await partnerApplicationService.getAllPartnerApplications();

        if (!partnerApplications) {
            throw new ControllerError(
                404,
                'UserNotFound',
                'No partner applications found'
            )
        }

        return reply.code(200).send(partnerApplications);
    });

    server.get<{ Params: { id: number } }>('/partner-applications/:id/', { schema: { ...getPartnerApplicationByIdSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const partnerApplication = await partnerApplicationService.getPartnerApplicationById(request.params.id);

        if (!partnerApplication) {
            throw new ControllerError(
                404,
                'UserNotFound',
                `Partner application with id ${request.params.id} was not found`
            )
        }

        return reply.code(200).send(partnerApplication);
    });

    server.patch<{ Querystring: { id: string }, Params: { id: number }, Body: PartnerApplicationUpdate }>('/partner-applications/:id/', { schema: { ...updatePartnerApplicationSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const partnerApplication = await partnerApplicationService.updateApplication(request.params.id, request.body);

        if (!partnerApplication) {
            throw new ControllerError(
                404,
                'UserNotFound',
                `Partner application with id ${request.query.id} was not found`
            )
        }

        return reply.code(200).send(partnerApplication);
    });

    server.delete<{ Params: DeletePartnerApplicationParams }>('/partner-applications/:id/', { schema: { ...deletePartnerApplicationSchema }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const partnerApplication = await partnerApplicationService.deleteApplication(request.params.id);
        return reply.code(204).send(partnerApplication);
    });

    server.post<{ Body: CreateDeliveryMethodRequest }>('/partners/delivery-methods/', { schema: { ...createDeliveryMethodSchema, tags: ['Partner Delivery Methods'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.createDeliveryMethod(request.body);
        return reply.code(201).send(deliveryMethod);
    });

    server.get('/partners/delivery-methods/', { schema: { ...getDeliveryMethodsSchema, tags: ['Partner Delivery Methods'] }, }, async (request, reply) => {
        const deliveryMethods = await deliveryMethodService.getDeliveryMethods();
        return reply.code(200).send(deliveryMethods);
    });

    server.get<{ Params: { id: number } }>('/partners/delivery-methods/:id/', { schema: { ...getDeliveryMethodByIdSchema, tags: ['Partner Delivery Methods'] }, }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.getDeliveryMethodById(request.params.id);
        return reply.code(200).send(deliveryMethod);
    });

    server.patch<{ Body: CreateDeliveryMethodRequest, Params: { id: number } }>('/partners/delivery-methods/:id/', { schema: { ...updateDeliveryMethodSchema, tags: ['Partner Delivery Methods'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.updateDeliveryMethod(request.params.id, request.body);
        return reply.code(200).send(deliveryMethod);
    });

    server.delete<{ Params: { id: number } }>('/partners/delivery-methods/:id/', { schema: { ...deleteDeliveryMethodSchema, tags: ['Partner Delivery Methods'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        await deliveryMethodService.deleteDeliveryMethod(request.params.id);
        return reply.code(204).send();
    });

    server.post<{ Body: CreateBusinessTypeRequest }>('/partners/business-types/', { schema: { ...createBusinessTypeSchema, tags: ['Partner Business Types'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const businessType = await businessTypeService.createBusinessType(request.body);
        return reply.code(201).send(businessType);
    });

    server.get('/partners/business-types/', { schema: { ...getBusinessTypesSchema, tags: ['Partner Business Types'] } }, async (request, reply) => {
        const businessTypes = await businessTypeService.getBusinessTypes();
        return reply.code(200).send(businessTypes);
    });

    server.get<{ Params: { id: number } }>('/partners/business-types/:id/', { schema: { ...getBusinessTypeByIdSchema, tags: ['Partner Business Types'] } }, async (request, reply) => {
        const businessType = await businessTypeService.getBusinessTypeById(request.params.id);
        return reply.code(200).send(businessType);
    });

    server.patch<{ Body: CreateBusinessTypeRequest, Params: { id: number } }>('/partners/business-types/:id/', { schema: { ...updateBusinessTypeSchema, tags: ['Partner Business Types'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const businessType = await businessTypeService.updateBusinessType(request.params.id, request.body);
        return reply.code(200).send(businessType);
    });

    server.delete<{ Params: { id: number } }>('/partners/business-types/:id/', { schema: { ...deleteBusinessTypeSchema, tags: ['Partner Business Types'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        await businessTypeService.deleteBusinessType(request.params.id);
        return reply.code(204).send();
    });

    server.post<{ Body: Partner, Params: { partner_id: number } }>('/partners/:partner_id/catalogs/', { schema: { ...createCatalogSchema, tags: ['Partner Catalogs'] } }, async (request, reply) => {
        // const userId = request.user.sub;

        // fetch partner by user id. Check if partner_id url matches the authenticated user's partner_id. If yes proceed with catalog creation.

        const catalog = await catalogService.createCatalog(request.params.partner_id, request.body);
        return reply.code(201).send(catalog);
    });

    server.get<{ Params: { partner_id: number }, Querystring: { expand?: string } }>('/partners/:partner_id/catalogs/', { schema: { ...getCatalogSchema, tags: ['Partner Catalogs'], querystring: GetCatalogsQuerySchema } }, async (request, reply) => {
        const expand = request.query.expand?.split(',').map(s => s.trim()) ?? [];
        const catalogs = await catalogService.findCatalogsByPartnerId(request.params.partner_id, expand);
        return reply.code(200).send(catalogs);
    });

    server.get<{ Params: { catalog_id: number } }>('/partners/:partner_id/catalogs/:catalog_id/', { schema: { ...getCatalogSchema, tags: ['Partner Catalogs'] } }, async (request, reply) => {

    })

    server.patch<{ Body: Partner, Params: { catalog_id: number } }>('/partners/:partner_id/catalogs/:catalog_id/', { schema: { ...createCatalogSchema, tags: ['Partner Catalogs'] } }, async (request, reply) => {

    })

    server.delete<{ Params: { catalog_id: number } }>('/partners/:partner_id/catalogs/:catalog_id/', { schema: { ...createCatalogSchema, tags: ['Partner Catalogs'] } }, async (request, reply) => {

    });

    server.post('/partners/:partner_id/catalogs/upload-menu/', { schema: { tags: ['Partner Catalogs'] } }, async (request, reply) => {

    })

    server.post('/partners/:partner_id/catalogs/import/', { schema: { tags: ['Partner Catalogs'] } }, async (request, reply) => {
        // Validate and process request.body.catalog
        // Create catalog, categories, and items in one transaction
        // Return created resources or summary
        // {
        //     "catalog": {
        //       "name": "Summer Menu",
        //       "categories": [
        //         {
        //           "name": "Starters",
        //           "items": [
        //             { "name": "Soup", "price": 5.0 },
        //             { "name": "Salad", "price": 6.0 }
        //           ]
        //         },
        //         {
        //           "name": "Mains",
        //           "items": [
        //             { "name": "Steak", "price": 20.0 }
        //           ]
        //         }
        //       ]
        //     }
        //   }
    });

    server.post('/partners/:partner_id/catalogs/:catalog_id/categories/', { schema: { tags: ['Partner Catalog Categories'] } }, async (request, reply) => {

    })

    server.get('/partners/:partner_id/catalogs/:catalog_id/categories/', { schema: { tags: ['Partner Catalog Categories'] } }, async (request, reply) => {

    })

    server.get('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/', { schema: { tags: ['Partner Catalog Categories'] } }, async (request, reply) => {

    })

    server.patch('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/', { schema: { tags: ['Partner Catalog Categories'] } }, async (request, reply) => {

    })

    server.delete('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/', { schema: { tags: ['Partner Catalog Categories'] } }, async (request, reply) => {

    })

    server.post('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/items/', { schema: { tags: ['Partner Catalog Items'] } }, async (request, reply) => {

    })

    server.get('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/items/', { schema: { tags: ['Partner Catalog Items'] } }, async (request, reply) => {

    })

    server.get('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/items/:item_id/', { schema: { tags: ['Partner Catalog Items'] } }, async (request, reply) => {

    })

    server.patch('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/items/:item_id/', { schema: { tags: ['Partner Catalog Items'] } }, async (request, reply) => {

    })

    server.delete('/partners/:partner_id/catalogs/:catalog_id/categories/:category_id/items/:item_id/', { schema: { tags: ['Partner Catalog Items'] } }, async (request, reply) => {

    })

    // server.post<{ Body: CreateCatalogCategoryRequest, Params: { catalog_id: number } }>('/catalogs/:catalog_id/categories/', { schema: { ...createCatalogCategorySchema, tags: ['Partner Catalog Categories'] } }, async (request, reply) => {
    //     const catalogCategory = await catalogService.createCatalogCategory(request.params.catalog_id, request.body);
    //     return reply.code(201).send(catalogCategory);
    // });

    // server.post<{ Body: CreateCatalogItemRequest, Params: { category_id: number } }>('/categories/:category_id/items/', { schema: { ...createCatalogItemSchema, tags: ['Partner Catalog Items'] } }, async (request, reply) => {
    //     const catalogItem = await catalogService.createCatalogItem(request.params.category_id, request.body);
    //     return reply.code(201).send(catalogItem);
    // });

    // --- Partner Hours CRUD ---

// Create a partner hour
server.post<{ Body: CreatePartnerHourRequest, Params: { partner_id: number } }>(
    '/partners/:partner_id/hours/',
    { schema: { ...createPartnerHourSchema, tags: ['Partner Hours'] } },
    async (request, reply) => {
      const hour = await partnerHourService.createPartnerHour({ ...request.body, partner_id: request.params.partner_id });
      return reply.code(201).send(hour);
    }
  );
  
  // Get all hours for a partner
  server.get<{ Params: { partner_id: number } }>(
    '/partners/:partner_id/hours/',
    { schema: { ...getPartnerHoursSchema, tags: ['Partner Hours'] } },
    async (request, reply) => {
      const hours = await partnerHourService.getPartnerHoursByPartnerId(request.params.partner_id);
      return reply.send(hours);
    }
  );
  
  // Get a specific partner hour
  server.get<{ Params: { partner_id: number, hour_id: number } }>(
    '/partners/:partner_id/hours/:hour_id/',
    { schema: { ...getPartnerHourByIdSchema, tags: ['Partner Hours'] } },
    async (request, reply) => {
      const hour = await partnerHourService.getPartnerHourById(request.params.hour_id);
      return reply.send(hour);
    }
  );
  
  // Update a specific partner hour
  server.patch<{ Body: UpdatePartnerHourRequest, Params: { partner_id: number, hour_id: number } }>(
    '/partners/:partner_id/hours/:hour_id/',
    { schema: { ...updatePartnerHourSchema, tags: ['Partner Hours'] } },
    async (request, reply) => {
      const hour = await partnerHourService.updatePartnerHour(request.params.hour_id, request.body);
      return reply.send(hour);
    }
  );
  
  // Delete a specific partner hour
  server.delete<{ Params: { partner_id: number, hour_id: number } }>(
    '/partners/:partner_id/hours/:hour_id/',
    { schema: { ...deletePartnerHourSchema, tags: ['Partner Hours'] } },
    async (request, reply) => {
      await partnerHourService.deletePartnerHour(request.params.hour_id);
      return reply.code(204).send();
    }
  );

    server.get<{ Querystring: PartnerFilter }>('/partners/', {
        schema: {
            querystring: PartnerFilterSchema, tags: ['Partners']
        }
    }, async (request, reply) => {
        const partners = await partnerService.getPartners(request.query);
        return reply.send(partners);
    })
}
