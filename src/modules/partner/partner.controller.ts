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
import { PartnerRow, PartnerRowWithAddress } from './partner.table';
import axios from 'axios';
import { CatalogService } from './catalog';

export interface PartnerControllerOptions {
    deliveryMethodService: DeliveryMethodService;
    businessTypeService: BusinessTypeService;
    partnerService: PartnerService;
    partnerHourService: PartnerHourService;
    catalogService: CatalogService;
}

export interface PartnerWithAddress {
    id: number;
    name: string;
    address: {
        city: string;
        street: string;
        postal_code: string;
        address_detail?: string;
    };
}

export const partnerController: FastifyPluginAsync<PartnerControllerOptions> = async function (server, { deliveryMethodService, businessTypeService, partnerService, partnerHourService, catalogService }) {
    server.post<{ Body: CreateDeliveryMethodRequest }>('/partners/delivery-methods/', { schema: { ...createDeliveryMethodSchema, tags: ['Partner Delivery Methods'] }, preHandler: [server.authenticate, server.guard.role('admin')] }, async (request, reply) => {
        const deliveryMethod = await deliveryMethodService.createDeliveryMethod(request.body);
        return reply.code(201).send(deliveryMethod);
    });

    server.get<{
        Querystring: { offset?: number; limit?: number; }
    }>('/partners/delivery-methods/', { schema: { ...getDeliveryMethodsSchema, tags: ['Partner Delivery Methods'] }, }, async (request, reply) => {
        const { offset, limit } = request.query;
        const { delivery_methods, count } = await deliveryMethodService.getDeliveryMethods({
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
        const { business_types, count } = await businessTypeService.getBusinessTypes({
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

    server.get('/partners/me/', { schema: { tags: ['Partners'] }, preHandler: [server.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;
        const partner = await partnerService.findPartnerByUserId(userId);
        return reply.code(200).send(partner);
    })


    server.get<{ Params: { id: number } }>('/partners/:id/', {
        schema: {
            tags: ['Partners'],
            summary: 'Get partner details by ID',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'number' }
                },
                required: ['id']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        phone_number: { type: 'string' },
                        logo_url: { type: 'string', nullable: true },
                        banner_url: { type: 'string', nullable: true },
                        status: { type: 'string' },
                        delivery_method_id: { type: 'number' },
                        business_type_id: { type: 'number' },
                        delivery_fee: { type: 'string' },
                        min_order_value: { type: 'string' },
                        max_delivery_distance_km: { type: 'string' },
                        min_preparation_time_minutes: { type: 'number' },
                        max_preparation_time_minutes: { type: 'number' },
                        smiley_image_url: { type: 'string', nullable: true },
                        smiley_report_link: { type: 'string', nullable: true }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const id = request.params.id;
        const partner = await partnerService.findPartnerById(id);
        return reply.code(200).send(partner);
    })

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

    server.patch<{
        Params: { id: number },
        Body: {
            name?: string,
            description?: string,
            delivery_method_id?: number,
            business_type_id?: number,
            min_order_value?: number | string,
            min_preparation_time_minutes?: number | string,
            max_preparation_time_minutes?: number | string,
            max_delivery_distance_km?: number | string,
            delivery_fee?: number | string,
            phone_number?: string,
            address?: {
                street?: string,
                postal_code?: string,
                city?: string,
                country?: string,
                address_detail?: string,
                latitude?: number,
                longitude?: number
            }
        }
    }>('/partners/:id/', {
        schema: {
            tags: ['Partners'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'number' }
                },
                required: ['id']
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    delivery_method_id: { type: 'number' },
                    business_type_id: { type: 'number' },
                    min_order_value: { type: 'number' },
                    min_preparation_time_minutes: { type: 'number' },
                    max_preparation_time_minutes: { type: 'number' },
                    max_delivery_distance_km: { type: 'number' },
                    delivery_fee: { type: 'number' },
                    phone_number: { type: 'string' },
                    address: {
                        type: 'object',
                        properties: {
                            street: { type: 'string' },
                            postal_code: { type: 'string' },
                            city: { type: 'string' },
                            country: { type: 'string' },
                            address_detail: { type: 'string' },
                            latitude: { type: 'number' },
                            longitude: { type: 'number' }
                        },
                        additionalProperties: false
                    }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        partner: {
                            type: 'object',
                            properties: {
                                id: { type: 'number' },
                                name: { type: 'string' },
                                phone_number: { type: 'string' },
                                delivery_method_id: { type: 'number' },
                                business_type_id: { type: 'number' },
                                min_order_value: { type: 'string' },
                                delivery_fee: { type: 'string' },
                                max_delivery_distance_km: { type: 'string' },
                                min_preparation_time_minutes: { type: 'number' },
                                max_preparation_time_minutes: { type: 'number' },
                                address: {
                                    type: 'object',
                                    properties: {
                                        street: { type: 'string' },
                                        postal_code: { type: 'string' },
                                        city: { type: 'string' },
                                        country: { type: 'string' },
                                        address_detail: { type: 'string' },
                                        latitude: { type: 'number' },
                                        longitude: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        preHandler: [
            server.authenticate,
            server.guard.role('admin', 'partner')
        ]
    }, async (request, reply) => {
        try {
            const partnerId = request.params.id;
            const { address, ...partnerData } = request.body;

            // Update basic partner data
            let updatedPartner;
            if (Object.keys(partnerData).length > 0) {
                updatedPartner = await partnerService.updatePartner(
                    partnerId,
                    partnerData
                );
            } else {
                updatedPartner = await partnerService.findPartnerById(partnerId);
            }

            // Handle address update if provided
            if (address) {
                await partnerService.updatePartnerAddress(partnerId, address);

                // Fetch the updated partner with address details
                updatedPartner = await partnerService.findPartnerByIdWithAddress(partnerId);
            }

            return reply.status(200).send({
                message: 'Partner updated successfully',
                partner: updatedPartner
            });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                message: 'Failed to update partner',
                statusCode: 500
            });
        }
    })

    server.post<{ Params: { id: number } }>('/partners/:id/smiley/scrape/', async (request, reply) => {
        const partner = await partnerService.findPartnerByIdWithAddress(request.params.id);
        if (!partner) {
            return reply.code(404).send({ message: 'Partner not found' });
        }

        // Respond immediately
        reply.code(202).send({ message: 'Smiley scraping started in background' });

        // Start background task (do not await)
        (async () => {
            try {
                const address = {
                    city: partner.city,
                    street: partner.street,
                    postal_code: partner.postal_code,
                    address_detail: partner.address_detail || '',
                };
                const formattedAddress = `${address.street}, ${address.postal_code} ${address.city}${address.address_detail ? ', ' + address.address_detail : ''}`;
                const response = await axios.get('http://localhost:8000/scrape-smiley/', {
                    params: {
                        name: partner.name,
                        address: formattedAddress
                    }
                });
                console.log(formattedAddress, partner.name);
                const result = response.data;
                console.log('Scraping result:', result);
                if (!result.error) {
                    await partnerService.updatePartner(request.params.id, {
                        smiley_image_url: result.smiley_image_url,
                        smiley_report_link: result.smiley_link
                    });
                }
            } catch (err) {
                console.error('Error in background smiley scraping:', err);
            }
        })();
    });
    server.post<{ Params: { partner_id: number } }>(
        '/partners/:partner_id/catalogs/ai/',
        {
            schema: {
                tags: ['Partner Catalogs'],
                consumes: ['multipart/form-data'],
                description: 'Upload a catalog image or PDF for AI processing',
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            image_url: { type: 'string' },
                            ai_results: {
                                type: 'object',
                                additionalProperties: true
                            }
                        }
                    }
                }
            },
            preHandler: [server.authenticate, server.guard.role('partner')]
        },
        async (request, reply) => {
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
            if (!allowedTypes.includes(data.mimetype)) {
                return reply.code(400).send({
                    message: 'Invalid file type. Only JPEG, PNG, WebP images and PDF files are allowed.'
                });
            }

            const fileBuffer = await data.toBuffer();

            console.log(`Received file: ${data.filename}, size: ${fileBuffer.length} bytes, type: ${data.mimetype}`);

            try {
                const formData = new FormData();
                formData.append('file', new Blob([fileBuffer]), data.filename);

                const aiResponse = await axios.post('http://localhost:8085/request/json/data', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                console.log('AI response:', aiResponse.data);

                let catalog = await catalogService.createCatalog(
                    Number(request.params.partner_id),
                    {
                        name: "AI Generated Catalog",
                        description: "Catalog generated from AI processing",
                        is_active: false
                    }
                );
                console.log('Catalog created:', catalog);
                let currentCategoryId: number | null = null;
                let lastItem: { name: string; price?: string } | null = null;
                let results = aiResponse.data.results || [];

                // If results is an array of pages, flatten to a single array
                if (
                    Array.isArray(results) &&
                    results.length > 0 &&
                    typeof results[0] === 'object' &&
                    'page' in results[0] &&
                    Array.isArray(results[0].results)
                ) {
                    results = results.flatMap((page: any) => page.results);
                }
                
                for (let i = 0; i < results.length; i++) {
                    const entry = results[i];

                    if (entry.label === 'CATEGORY') {
                        // Insert the actual category name from AI
                        console.log(`Creating category: ${entry.text}`);
                        const category = await catalogService.createCatalogCategory(
                            catalog.id,
                            { name: entry.text }
                        );
                        currentCategoryId = category.id;
                    } else if (entry.label === 'ITEM' && currentCategoryId) {

                        // Look ahead for a PRICE
                        let price: string | null = null;
                        if (i + 1 < results.length && results[i + 1].label === 'PRICE') {
                            price = results[i + 1].text;
                            i++; // Skip the price entry in the next loop
                        }
                        console.log(`Creating catalog item with price: ${entry.text}, ${price}`);
                        await catalogService.createCatalogItem(
                            currentCategoryId,
                            {
                            name: entry.text,
                            price: price && !isNaN(parseFloat(price)) ? parseFloat(price) : 0,
                            description: '',
                            catalog_category_id: currentCategoryId,
                        });
                    }
                }
                // Insert any trailing item without price
                if (lastItem && currentCategoryId) {
                    await catalogService.createCatalogItem(
                        currentCategoryId,
                        {
                            name: lastItem.name,
                            price: lastItem.price ? parseFloat(lastItem.price) : null,
                            description: '',
                            catalog_category_id: currentCategoryId,
                        }
                    );
                }
                return reply.code(201).send({
                    message: 'Catalog file processed successfully',
                    ai_results: aiResponse.data
                });
            } catch (error) {
                request.log.error('Error processing file with AI:', error);
            }
        }
    );
}

export function partnerRowWithAddress(row: PartnerRowWithAddress): PartnerWithAddress {
    return {
        id: row.id,
        name: row.name,
        address: {
            city: row.address.city,
            street: row.address.street,
            postal_code: row.address.postal_code,
            address_detail: row.address.address_detail || '',
        }
    };
}