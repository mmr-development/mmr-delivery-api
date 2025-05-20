import { FastifyPluginAsync } from 'fastify';
import { PartnerFilter, PartnerFilterSchema } from './partner.schema';
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
import { PartnerService } from './partner.service';
import { PartnerHourService } from './partner-hour/partner-hour.service';
import { CreatePartnerHourRequest, createPartnerHourSchema, deletePartnerHourSchema, getPartnerHourByIdSchema, getPartnerHoursSchema, UpdatePartnerHourRequest, updatePartnerHourSchema } from './partner-hour/partner-hour.schema';

export interface PartnerControllerOptions {
    deliveryMethodService: DeliveryMethodService;
    businessTypeService: BusinessTypeService;
    partnerService: PartnerService;
    partnerHourService: PartnerHourService;
}

export const partnerController: FastifyPluginAsync<PartnerControllerOptions> = async function (server, { deliveryMethodService, businessTypeService, partnerService, partnerHourService }) {
    server.post<{ Body: CreateDeliveryMethodRequest }>('/partners/delivery-methods/', { schema: { ...createDeliveryMethodSchema, tags: ['Partner Delivery Methods'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.createDeliveryMethod(request.body);
        return reply.code(201).send(deliveryMethod);
    });

    server.get<{
        Querystring: { offset?: number; limit?: number; }
    }>('/partners/delivery-methods/', { schema: { ...getDeliveryMethodsSchema, tags: ['Partner Delivery Methods'] }, }, async (request, reply) => {
        const { offset, limit } = request.query;
        const {delivery_methods, count} = await deliveryMethodService.getDeliveryMethods({
            offset,
            limit,
        });
        return reply.code(200).send({
            delivery_methods,
            pagination: {
                total: count,
                offset,
                limit
            }
        });
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

    server.get<{
        Querystring: { offset?: number; limit?: number; }
    }>('/partners/business-types/', { schema: { ...getBusinessTypesSchema, tags: ['Partner Business Types'] } }, async (request, reply) => {
        const { offset, limit } = request.query;
        const {business_types, count} = await businessTypeService.getBusinessTypes({
            offset,
            limit,
        });
        return reply.code(200).send({
            business_types: business_types,
            pagination: {
                total: count,
                offset,
                limit
            }
        });
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

    server.get('/partners/me/', { schema: { tags: ['Partners']}, preHandler: [server.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;
        const partner = await partnerService.findPartnerByUserId(userId);
        return reply.code(200).send(partner);
    })

    
    server.get<{ Params: { id: number }}>('/partners/:id/', { schema: { tags: ['Partners']} }, async (request, reply) => {
        const id = request.params.id;
        const partner = await partnerService.findPartnerById(id);
        return reply.code(200).send(partner);
    })

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

    // Upload partner logo
    server.post<{ Params: { id: number } }>(
        '/partners/:id/logo/',
        {
            schema: {
                tags: ['Partners'],
                consumes: ['multipart/form-data'],
                description: 'Upload a restaurant logo image',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            image_url: { type: 'string' }
                        }
                    }
                }
            },
            preHandler: [
                server.authenticate,
                async (request, reply) => {
                    const partnerId = parseInt(request.params.id as any);
                    const userId = request.user.sub;
                    const partner = await partnerService.findPartnerById(partnerId);
                    
                    if (!partner) {
                        return reply.code(404).send({ message: 'Partner not found' });
                    }
                    
                    if (partner.user_id !== userId && !request.user.roles?.includes('admin')) {
                        return reply.code(403).send({ message: 'Unauthorized' });
                    }
                }
            ]
        },
        async (request, reply) => {
            const data = await request.file();
            
            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(data.mimetype)) {
                return reply.code(400).send({ 
                    message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
                });
            }

            const imageUrl = await partnerService.savePartnerLogo(
                parseInt(request.params.id as any),
                data.filename,
                await data.toBuffer()
            );
            
            return reply.code(200).send({
                message: 'Logo uploaded successfully',
                image_url: imageUrl
            });
        }
    );
    
    server.post<{ Params: { id: number } }>(
        '/partners/:id/banner/',
        {
            schema: {
                tags: ['Partners'],
                consumes: ['multipart/form-data'],
                description: 'Upload a restaurant banner image',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            image_url: { type: 'string' }
                        }
                    }
                }
            },
            preHandler: [
                server.authenticate,
                async (request, reply) => {
                    const partnerId = parseInt(request.params.id as any);
                    const userId = request.user.sub;
                    const partner = await partnerService.findPartnerById(partnerId);
                    
                    if (!partner) {
                        return reply.code(404).send({ message: 'Partner not found' });
                    }
                    
                    if (partner.user_id !== userId && !request.user.roles?.includes('admin')) {
                        return reply.code(403).send({ message: 'Unauthorized' });
                    }
                }
            ]
        },
        async (request, reply) => {
            const data = await request.file();
            
            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }
            
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/avif'];
            if (!allowedTypes.includes(data.mimetype)) {
                return reply.code(400).send({ 
                    message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
                });
            }
            
            // Save file and get URL
            const imageUrl = await partnerService.savePartnerBanner(
                parseInt(request.params.id as any),
                data.filename,
                await data.toBuffer()
            );
            
            return reply.code(200).send({
                message: 'Banner uploaded successfully',
                image_url: imageUrl
            });
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
