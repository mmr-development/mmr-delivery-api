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
  country: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  latitude: Type.Optional(Type.Number({ description: 'Latitude of the address' })),
  longitude: Type.Optional(Type.Number({ description: 'Longitude of the address' })),
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
export const PaginationQuerySchema = Type.Object({
  offset: Type.Optional(Type.Number({
    description: 'Number of items to skip',
  })),
  limit: Type.Optional(Type.Number({
    description: 'Maximum number of items to return',
  }))
});

// Compose with your filter schema
export const PartnerApplicationFilterSchema = Type.Intersect([
  Type.Object({
    status: Type.Optional(Type.Union([
      Type.Literal('pending'),
      Type.Literal('reviewing'),
      Type.Literal('approved'),
      Type.Literal('rejected'),
      Type.Literal('suspended')
    ])),
  }),
  PaginationQuerySchema
]);

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
  applications: Type.Array(PartnerApplicationResponseSchema),
  pagination: Type.Optional(Type.Object({
    total: Type.Number({ description: 'Total number of partner applications available' }),
    offset: Type.Optional(Type.Number({ description: 'Current offset (number of applications skipped)' })),
    limit: Type.Optional(Type.Number({ description: 'Current limit (maximum number of applications returned)' }))
  }))
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
  logo_url: Type.String(),
  banner_url: Type.String(),
  phone_number: Type.String(),
  status: Type.String(),
  delivery: Type.Object({
    fee: Type.Number(),
    min_order_value: Type.Number(),
    max_distance_km: Type.Number(),
    min_preparation_time_minutes: Type.Number(),
    max_preparation_time_minutes: Type.Number()
  }),
  business_type: Type.Object({
    id: Type.Number(),
    name: Type.String()
  }),
  address: Type.Object({
    id: Type.Number(),
    street: Type.String(),
    address_detail: Type.Optional(Type.String()),
    city: Type.String(),
    postal_code: Type.String(),
    country: Type.String(),
  }),
  // Other commented properties can be uncommented as needed
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
  offset: Type.Optional(Type.Number({
    description: 'Number of items to skip',
  })),
  limit: Type.Optional(Type.Number({
    description: 'Maximum number of items to return',
  })),
  open_now: Type.Optional(Type.Boolean()),
  timezone: Type.Optional(Type.String({
    description: 'Timezone for open_now filter. Accepts IANA timezone names (e.g., "Europe/Copenhagen", "America/New_York"), common abbreviations (e.g., "UTC", "GMT"), or UTC offsets (e.g., "UTC+2", "-05:00")'
  }))
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
  partners: Type.Array(PartnerListItemSchema),
  pagination: Type.Optional(Type.Object({
    total: Type.Number({ description: 'Total number of partners available' }),
    offset: Type.Optional(Type.Number({ description: 'Current offset (number of partners skipped)' })),
    limit: Type.Optional(Type.Number({ description: 'Current limit (maximum number of partners returned)' }))
  }))
});

// TypeScript types
export type RestaurantListItem = Static<typeof PartnerListItemSchema>;
export type PartnerFilter = Static<typeof PartnerFilterSchema>;
export type PartnerListing = Static<typeof PartnerListingSchema>;
