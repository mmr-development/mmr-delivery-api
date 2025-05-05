import { FastifyPluginAsync } from 'fastify';
import { partnerApplicationSchema, PartnerFilter, PartnerFilterSchema } from './partner.schema';
import { PartnerApplicationService } from './partner-application.service';
import { Partner, PartnerApplicationRequest } from './partner';
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
import { createCatalogSchema, CatalogService, createCatalogCategorySchema, createCatalogItemSchema } from './catalog';
import { CreateCatalogCategoryRequest } from './catalog/catelog-category';
import { CreateCatalogItemRequest } from './catalog/catalog-item';
// import { PartnerService } from './partner.service';

export interface PartnerControllerOptions {
    partnerApplicationService: PartnerApplicationService;
    deliveryMethodService: DeliveryMethodService;
    businessTypeService: BusinessTypeService;
    catalogService: CatalogService;
    // partnerService: PartnerService;
}

export const partnerController: FastifyPluginAsync<PartnerControllerOptions> = async function (server, { partnerApplicationService, deliveryMethodService, businessTypeService, catalogService }) {
    server.post<{ Body: PartnerApplicationRequest }>('/partner-applications/', { schema: { ...partnerApplicationSchema, tags: ['Partner Applications'] } }, async (request, reply) => {
        await partnerApplicationService.submitApplication({
            contact_person: {
                first_name: request.body.contact_person.first_name,
                last_name: request.body.contact_person.last_name,
                email: request.body.contact_person.email,
                phone_number: request.body.contact_person.phone_number,
            },
            business: {
                name: request.body.business.name
            },
            delivery_method_id: request.body.delivery_method_id,
            business_type_id: request.body.business_type_id,
        });

        return reply.code(201).send({
            message: 'Partner application submitted successfully',
        })
    });

    server.get('/partner-applications/', { schema: { tags: ['Partner Applications'], security: [{ bearerAuth: [] }] }, preHandler: [server.authenticate, server.guard.role('admin') ]}, async (request, reply) => {
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

    server.get<{ Params: { id: number } }>('/partner-applications/:id/', { schema: { tags: ['Partner Applications'], security: [{ bearerAuth: [] }] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
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

    server.patch('/partner-applications/:id/', { schema: { tags: ['Partner Applications'], security: [{ bearerAuth: [] }] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {

    });

    server.delete('/partner-applications/:id/', { schema: { tags: ['Partner Applications'], security: [{ bearerAuth: [] }] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {

    });

    server.post<{ Body: CreateDeliveryMethodRequest }>('/partners/delivery-methods/', { schema: { ...createDeliveryMethodSchema, tags: ['Partner Delivery Methods'] } }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.createDeliveryMethod(request.body);
        return reply.code(201).send(deliveryMethod);
    });

    server.get('/partners/delivery-methods/', { schema: { ...getDeliveryMethodsSchema, tags: ['Partner Delivery Methods'] } }, async (request, reply) => {
        const deliveryMethods = await deliveryMethodService.getDeliveryMethods();
        return reply.code(200).send(deliveryMethods);
    });

    server.get<{ Params: { id: number } }>('/partners/delivery-methods/:id/', { schema: { ...getDeliveryMethodByIdSchema, tags: ['Partner Delivery Methods'] } }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.getDeliveryMethodById(request.params.id);
        return reply.code(200).send(deliveryMethod);
    });

    server.patch<{ Body: CreateDeliveryMethodRequest, Params: { id: number } }>('/partners/delivery-methods/:id/', { schema: { ...updateDeliveryMethodSchema, tags: ['Partner Delivery Methods'] } }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.updateDeliveryMethod(request.params.id, request.body);
        return reply.code(200).send(deliveryMethod);
    });

    server.delete<{ Params: { id: number } }>('/partners/delivery-methods/:id/', { schema: { ...deleteDeliveryMethodSchema, tags: ['Partner Delivery Methods'] } }, async (request, reply) => {
        await deliveryMethodService.deleteDeliveryMethod(request.params.id);
        return reply.code(204).send();
    });

    server.post<{ Body: CreateBusinessTypeRequest }>('/partners/business-types/', { schema: { ...createBusinessTypeSchema, tags: ['Partner Business Types'] } }, async (request, reply) => {
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

    server.patch<{ Body: CreateBusinessTypeRequest, Params: { id: number } }>('/partners/business-types/:id/', { schema: { ...updateBusinessTypeSchema, tags: ['Partner Business Types'] } }, async (request, reply) => {
        const businessType = await businessTypeService.updateBusinessType(request.params.id, request.body);
        return reply.code(200).send(businessType);
    });

    server.delete<{ Params: { id: number } }>('/partners/business-types/:id/', { schema: { ...deleteBusinessTypeSchema, tags: ['Partner Business Types'] } }, async (request, reply) => {
        await businessTypeService.deleteBusinessType(request.params.id);
        return reply.code(204).send();
    });

    server.post<{ Body: Partner, Params: { partner_id: number } }>('/partners/:partner_id/catalogs/', { schema: { ...createCatalogSchema, tags: ['Partner Catalogs'] } }, async (request, reply) => {
        // const partner = await partnerApplicationService.createPartner(request.params.partner_id, request.body);
        // return reply.code(201).send(partner);
        const catalog = await catalogService.createCatalog(request.params.partner_id, request.body);
        return reply.code(201).send(catalog);
    });

    server.post<{ Body: CreateCatalogCategoryRequest, Params: { catalog_id: number } }>('/catalogs/:catalog_id/categories/', { schema: { ...createCatalogCategorySchema, tags: ['Partner Catalog Categories'] } }, async (request, reply) => {
        const catalogCategory = await catalogService.createCatalogCategory(request.params.catalog_id, request.body);
        return reply.code(201).send(catalogCategory);
    });

    server.post<{ Body: CreateCatalogItemRequest, Params: { category_id: number } }>('/categories/:category_id/items/', { schema: { ...createCatalogItemSchema, tags: ['Partner Catalog Items'] } }, async (request, reply) => {
        const catalogItem = await catalogService.createCatalogItem(request.params.category_id, request.body);
        return reply.code(201).send(catalogItem);
    });

    // server.get<{ Querystring: PartnerFilter }>('/partners', {
    //     schema: {
    //         querystring: PartnerFilterSchema, tags: ['Partners']
    //     }
    // }, async (request, reply) => {
    //     return partnerService.getPartners(request.query)
    // })
}
