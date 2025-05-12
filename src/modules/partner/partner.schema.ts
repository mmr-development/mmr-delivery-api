import { Static, Type } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

// Partner Application Schema using TypeBox
export const ContactPersonSchema = Type.Object({
    first_name: Type.String({ minLength: 1, maxLength: 100 }),
    last_name: Type.String({ minLength: 1, maxLength: 100 }),
    phone_number: Type.String({
        description: 'Phone number in international or local format'
    }),
    email: Type.String({ format: 'email' })
});

export const AddressSchema = Type.Object({
    street: Type.String({ minLength: 1, maxLength: 255 }),
    address_detail: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    city: Type.String({ minLength: 1, maxLength: 100 }),
    postal_code: Type.String({ minLength: 1, maxLength: 20 }),
    country: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
});

export const BusinessSchema = Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 }),
    phone_number: Type.String({
      description: 'Business phone number in international or local format'
    }),
    address: AddressSchema,
});

export const PartnerApplicationRequestSchema = Type.Object({
    contact_person: ContactPersonSchema,
    business: BusinessSchema,
    delivery_method_id: Type.Integer({ minimum: 1 }),
    business_type_id: Type.Integer({ minimum: 1 }),
});

// Fastify schema
export const partnerApplicationSchema: FastifySchema = {
    body: PartnerApplicationRequestSchema,
    response: {
        201: Type.Object({
            message: Type.String(),
            status: Type.Integer()
            // id: Type.Integer(),
            // status: Type.String(),
            // created_at: Type.String({ format: 'date-time' })
        })
    },
    tags: ['Partner Applications'],
    description: 'Submit a new partner application',
    summary: 'Create partner application'
};

// TypeScript types
export type ContactPerson = Static<typeof ContactPersonSchema>;
export type Address = Static<typeof AddressSchema>;
export type Business = Static<typeof BusinessSchema>;
export type PartnerApplicationRequest = Static<typeof PartnerApplicationRequestSchema>;

// Add these new schemas to your existing file

// Filter schema for querying partner applications
export const PartnerApplicationFilterSchema = Type.Object({
    status: Type.Optional(Type.Union([
        Type.Literal('pending'),
        Type.Literal('reviewing'),
        Type.Literal('approved'),
        Type.Literal('rejected'),
        Type.Literal('suspended')
    ])),
    // business_type_id: Type.Optional(Type.Integer({ minimum: 1 })),
    // delivery_method_id: Type.Optional(Type.Integer({ minimum: 1 })),
    // from_date: Type.Optional(Type.String({ format: 'date-time' })),
    // to_date: Type.Optional(Type.String({ format: 'date-time' })),
    // search: Type.Optional(Type.String()),
    // page: Type.Optional(Type.Number({ default: 1, minimum: 1 })),
    // limit: Type.Optional(Type.Number({ default: 20, minimum: 1, maximum: 100 })),
    // sort_by: Type.Optional(Type.Enum({
    //     NEWEST: 'newest',
    //     OLDEST: 'oldest',
    //     NAME_ASC: 'name_asc',
    //     NAME_DESC: 'name_desc'
    // }))
});

// Individual partner application response
export const PartnerApplicationResponseSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    status: Type.String(),
    delivery_method: Type.Object({
        id: Type.Number(),
        name: Type.String()
    }),
    business_type: Type.Object({
        id: Type.Number(),
        name: Type.String()
    }),
    contact_person: Type.Object({
        id: Type.String({ format: 'uuid' }),
        first_name: Type.String(),
        last_name: Type.String(),
        email: Type.String({ format: 'email' }),
        phone_number: Type.String()
    }),
    address: Type.Object({
        street: Type.String(),
        city: Type.String(),
        postal_code: Type.String(),
        country: Type.String()
    }),
    phone_number: Type.String(),
    // created_at: Type.String({ format: 'date-time' }),
    // updated_at: Type.String({ format: 'date-time' })
});

// Partner applications list response
export const PartnerApplicationListSchema = Type.Object({
    // total_count: Type.Number(),
    // page: Type.Number(),
    // limit: Type.Number(),
    applications: Type.Array(PartnerApplicationResponseSchema)
});

// Fastify schema for GET endpoint
export const getPartnerApplicationsSchema: FastifySchema = {
    querystring: PartnerApplicationFilterSchema,
    response: {
        200: PartnerApplicationListSchema
    },
    tags: ['Partner Applications'],
    description: 'Get a list of partner applications with optional filtering',
    summary: 'List partner applications',
    security: [{ bearerAuth: [] }],
};

// Fastify schema for GET by ID endpoint
export const getPartnerApplicationByIdSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number()
    }),
    response: {
        200: PartnerApplicationResponseSchema,
        404: Type.Object({
            message: Type.String(),
            statusCode: Type.Number()
        })
    },
    tags: ['Partner Applications'],
    description: 'Get detailed information about a specific partner application',
    summary: 'Get partner application by ID',
    security: [{ bearerAuth: [] }],
};

export const PartnerApplicationUpdateSchema = Type.Object({
    contact_person: Type.Optional(Type.Object({
      first_name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
      last_name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
      phone_number: Type.Optional(Type.String()),
      email: Type.Optional(Type.String({ format: 'email' }))
    })),
    business: Type.Optional(Type.Object({
      name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
      phone_number: Type.Optional(Type.String()),
      address: Type.Optional(Type.Object({
        street: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
        city: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
        postal_code: Type.Optional(Type.String({ minLength: 1, maxLength: 20 })),
        country: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
      }))
    })),
    delivery_method_id: Type.Optional(Type.Integer({ minimum: 1 })),
    business_type_id: Type.Optional(Type.Integer({ minimum: 1 })),
    status: Type.Optional(Type.Union([
      Type.Literal('pending'),
      Type.Literal('reviewing'),
      Type.Literal('approved'),
      Type.Literal('rejected'),
      Type.Literal('suspended')
    ]))
  });
  
  // FastifySchema for the PATCH endpoint
  export const updatePartnerApplicationSchema: FastifySchema = {
    params: Type.Object({
      id: Type.Number()
    }),
    body: PartnerApplicationUpdateSchema,
    response: {
      200: PartnerApplicationResponseSchema,
      404: Type.Object({
        message: Type.String(),
        statusCode: Type.Number()
      })
    },
    tags: ['Partner Applications'],
    description: 'Update an existing partner application',
    summary: 'Update partner application',
    security: [{ bearerAuth: [] }]
  };

// TypeScript types
export type PartnerApplicationFilter = Static<typeof PartnerApplicationFilterSchema>;
export type PartnerApplicationResponse = Static<typeof PartnerApplicationResponseSchema>;
export type PartnerApplicationList = Static<typeof PartnerApplicationListSchema>;
export type PartnerApplicationUpdate = Static<typeof PartnerApplicationUpdateSchema>;

export const deletePartnerApplicationSchema: FastifySchema = {
    params: Type.Object({
      id: Type.Number({
        description: 'ID of the partner application to delete'
      })
    }),
    response: {
      200: Type.Object({
        message: Type.String(),
        deleted: Type.Boolean()
      }),
      404: Type.Object({
        message: Type.String(),
        statusCode: Type.Number()
      })
    },
    tags: ['Partner Applications'],
    description: 'Delete a partner application by ID',
    summary: 'Delete partner application',
    security: [{ bearerAuth: [] }]
  };
  
  // TypeScript types for delete request/response
  export type DeletePartnerApplicationParams = {
    id: number;
  };
  
  export type DeletePartnerApplicationResponse = {
    message: string;
    deleted: boolean;
  };

// Basic restaurant info
export const PartnerProperties = {
    id: Type.Number(),
    name: Type.String(),
    address: Type.Object({
      id: Type.Number(),
      street: Type.String(),
      address_detail: Type.Optional(Type.String()),
      city: Type.String(),
      postal_code: Type.String(),
      country: Type.String(),
    }),
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
    // created_at: Type.String({ format: 'date-time' }),
    // updated_at: Type.String({ format: 'date-time' }),
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
    street: Type.Optional(Type.String()),
    address_detail: Type.Optional(Type.String()),
    city: Type.Optional(Type.String()),
    postal_code: Type.Optional(Type.String()),
    country: Type.Optional(Type.String()),
    // open_now: Type.Optional(Type.Boolean()),
    // is_new: Type.Optional(Type.Boolean()),
    // free_delivery: Type.Optional(Type.Boolean()),
    // min_hygiene_rating: Type.Optional(Type.Number()),
    // max_delivery_fee: Type.Optional(Type.Number()),
    // min_rating: Type.Optional(Type.Number()),
    // has_offers: Type.Optional(Type.Boolean()),
    // dietary_options: Type.Optional(Type.Array(Type.String())),
    // cuisines: Type.Optional(Type.Array(Type.String())),
    // search: Type.Optional(Type.String()),
    // latitude: Type.Optional(Type.Number()),
    // longitude: Type.Optional(Type.Number()),
    // radius: Type.Optional(Type.Number()),
    // sort_by: Type.Optional(Type.Enum({
    //     DISTANCE: 'distance',
    //     RATING: 'rating',
    //     DELIVERY_TIME: 'delivery_time',
    //     DELIVERY_FEE: 'delivery_fee'
    // })),
    // page: Type.Optional(Type.Number({ default: 1 })),
    // limit: Type.Optional(Type.Number({ default: 20, maximum: 100 })),
});

// Restaurant listing response
export const PartnerListingSchema = Type.Object({
    // total_count: Type.Number(),
    // page: Type.Number(),
    // limit: Type.Number(),
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
