import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// Base catalog properties
export const CatalogProperties = {
  id: Type.Number(),
  partner_id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
};

// Base catalog category properties
export const CatalogCategoryProperties = {
  id: Type.Number(),
  catalog_id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
};

// Catalog entity (full model)
export const CatalogSchema = Type.Object({
  ...CatalogProperties,
});

// Catalog category entity (full model)
export const CatalogCategorySchema = Type.Object({
  ...CatalogCategoryProperties,
});

// Schema for creating a new catalog
export const CreateCatalogSchema = Type.Object({
  name: CatalogProperties.name,
});

// Schema for creating a new catalog category
export const CreateCatalogCategorySchema = Type.Object({
  name: CatalogCategoryProperties.name,
});

// Schema for updating a catalog
export const UpdateCatalogSchema = Type.Object({
  name: CatalogProperties.name,
});

// Schema for catalog response
export const CatalogResponseSchema = CatalogSchema;

// TypeScript types
export type Catalog = Static<typeof CatalogSchema>;
export type CreateCatalogDto = Static<typeof CreateCatalogSchema>;
export type UpdateCatalogDto = Static<typeof UpdateCatalogSchema>;

// Fastify route schemas
export const getCatalogsSchema: FastifySchema = {
  response: {
    200: Type.Array(CatalogResponseSchema),
  },
  tags: ['catalogs'],
  description: 'Get all catalogs for a partner',
};

export const GetCatalogsQuerySchema = Type.Object({
  expand: Type.Optional(Type.String({
      description: 'Comma-separated list of related entities to expand (e.g. categories,items)'
  }))
});

export const getCatalogSchema: FastifySchema = {
  params: Type.Object({
    partner_id: Type.Number(),
  }),
  // response: {
  //   200: CatalogResponseSchema,
  // },
  tags: ['catalogs'],
  description: 'Get all catalogs for a partner',
};

export const createCatalogSchema: FastifySchema = {
  body: CreateCatalogSchema,
  response: {
    201: CatalogResponseSchema,
  },
  tags: ['catalogs'],
  description: 'Create a new catalog',
};

export const updateCatalogSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number(),
  }),
  body: UpdateCatalogSchema,
  response: {
    200: CatalogResponseSchema,
  },
  tags: ['catalogs'],
  description: 'Update a catalog by ID',
};

export const deleteCatalogSchema: FastifySchema = {
  params: Type.Object({
    id: Type.Number(),
  }),
  response: {
    204: Type.Null(),
  },
  tags: ['catalogs'],
  description: 'Delete a catalog by ID',
};

export const CatalogCategoryResponseSchema = CatalogCategorySchema;

export const createCatalogCategorySchema: FastifySchema = {
  params: Type.Object({
    catalog_id: Type.Number(),
  }),
  body: CreateCatalogCategorySchema,
  response: {
    201: CatalogCategoryResponseSchema, // Fixed: now using the correct response schema
  },
  tags: ['catalogs'],
  description: 'Create a new catalog category',
};

export const CatalogItemProperties = {
  id: Type.Number(),
  catalog_category_id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.String(),
  price: Type.Number(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
};

export const CreateCatalogItemSchema = Type.Object({
  name: CatalogItemProperties.name,
  description: CatalogItemProperties.description,
  price: CatalogItemProperties.price,
});

export const CatalogItemResponseSchema = Type.Object({
  ...CatalogItemProperties
});

export type CreateCatalogItemDto = Static<typeof CreateCatalogItemSchema>;

export const createCatalogItemSchema: FastifySchema = {
  params: Type.Object({
    category_id: Type.Number(),
  }),
  body: CreateCatalogItemSchema,
  response: {
    201: CatalogItemResponseSchema,
  },
  tags: ['catalogs'],
  description: 'Create a new catalog item',
};