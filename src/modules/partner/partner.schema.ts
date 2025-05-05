import { Static, Type } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

// export const partnerApplicationSchema: FastifySchema = Type.Object({
//     body: Type.Object({
//         contact_person: Type.Object({
//             first_name: Type.String({ minLength: 1, maxLength: 100 }),
//             last_name: Type.String({ minLength: 1, maxLength: 100 }),
//             phone_number: Type.String({
//                 pattern: '^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$',
//                 description: 'Phone number in international or local format'
//             }),
//             email: Type.String({ format: 'email' })
//         }),
//         business: Type.Object({
//             name: Type.String({ minLength: 1, maxLength: 255 }),
//             address: Type.Object({
//                 street: Type.String({ minLength: 1, maxLength: 255 }),
//             }),
//         })
//     })
// })


export const partnerApplicationSchema: FastifySchema = {
    body: {
        type: 'object',
        properties: {
            contact_person: {
                type: 'object',
                properties: {
                    first_name: { type: 'string', minLength: 1, maxLength: 100 },
                    last_name: { type: 'string', minLength: 1, maxLength: 100 },
                    phone_number: { type: 'string' },
                    email: { type: 'string', format: 'email' }
                },
                required: ['first_name', 'last_name', 'phone_number', 'email']
            },
            business: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 255 },
                    address: {
                        type: 'object',
                        properties: {
                            street: { type: 'string', minLength: 1, maxLength: 255 }
                        },
                        required: ['street']
                    }
                },
                required: ['name']
            },
            delivery_method_id: { type: 'integer' },
            business_type_id: { type: 'integer' }
        },
        required: ['contact_person', 'business', 'delivery_method_id', 'business_type_id']
    }
}

// Basic restaurant info
export const PartnerProperties = {
    id: Type.Number(),
    name: Type.String(),
    // logo_url: Type.String(),
    // delivery_time_min: Type.Number(),
    // delivery_time_max: Type.Number(),
    // delivery_fee: Type.Number(),
    // minimum_order_amount: Type.Number(),
    // average_rating: Type.Number(),
    // rating_count: Type.Number(),
    // hygiene_rating: Type.Optional(Type.Number()),
    // is_new: Type.Boolean(),
    // has_stamp_card: Type.Boolean(),
    // is_open_now: Type.Boolean(),
    // cuisines: Type.Array(Type.String()),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
  };
  
  // Restaurant card in listings
  export const PartnerListItemSchema = Type.Object({
    ...PartnerProperties,
    // distance: Type.Optional(Type.Number()),
    // promotions: Type.Array(Type.Object({
    //   type: Type.String(),
    //   description: Type.String(),
    // })),
  });
  
  // Restaurant filtering parameters
  export const PartnerFilterSchema = Type.Object({
    open_now: Type.Optional(Type.Boolean()),
    is_new: Type.Optional(Type.Boolean()),
    free_delivery: Type.Optional(Type.Boolean()),
    // min_hygiene_rating: Type.Optional(Type.Number()),
    max_delivery_fee: Type.Optional(Type.Number()),
    min_rating: Type.Optional(Type.Number()),
    // has_offers: Type.Optional(Type.Boolean()),
    // dietary_options: Type.Optional(Type.Array(Type.String())),
    // cuisines: Type.Optional(Type.Array(Type.String())),
    // search: Type.Optional(Type.String()),
    // latitude: Type.Optional(Type.Number()),
    // longitude: Type.Optional(Type.Number()),
    // radius: Type.Optional(Type.Number()),
    sort_by: Type.Optional(Type.Enum({ 
      DISTANCE: 'distance',
      RATING: 'rating',
      DELIVERY_TIME: 'delivery_time',
      DELIVERY_FEE: 'delivery_fee'
    })),
    page: Type.Optional(Type.Number({ default: 1 })),
    limit: Type.Optional(Type.Number({ default: 20, maximum: 100 })),
  });
  
  // Restaurant listing response
  export const PartnerListingSchema = Type.Object({
    total_count: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    // categories: Type.Array(Type.Object({
    //   name: Type.String(),
    //   partners: Type.Array(PartnerListItemSchema)
    // })),
    partners: Type.Array(PartnerListItemSchema)
  });
  
  // TypeScript types
  export type RestaurantListItem = Static<typeof PartnerListItemSchema>;
  export type PartnerFilter = Static<typeof PartnerFilterSchema>;
  export type PartnerListing = Static<typeof PartnerListingSchema>;
