import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { CategorySchema } from './catalog-category.schema';
import { ItemSchema } from './catalog-item.schema';

// ------------------- Type Definitions -------------------

// Catalog Types
export const CatalogSchema = Type.Object({
  id: Type.Number({ description: 'Unique identifier for the catalog' }),
  partner_id: Type.Number({ description: 'ID of the partner who owns this catalog' }),
  name: Type.String({ description: 'Name of the catalog'}),
  description: Type.Optional(Type.String({ 
    description: 'Optional description of the catalog',
  })),
  is_active: Type.Boolean({ 
    description: 'Whether the catalog is currently active and visible to customers',
    default: false
  }),
}, {
  description: 'Represents a catalog of products or services'
});

export const CreateCatalogSchema = Type.Object({
  name: Type.String({ 
    description: 'Name of the catalog', 
    minLength: 1,
    maxLength: 100
  }),
  description: Type.Optional(Type.String({ 
    description: 'Optional description of the catalog',
  })),
  is_active: Type.Optional(Type.Boolean({ 
    description: 'Whether the catalog is active and visible to customers',
    default: false
  }))
}, {
  description: 'Data required to create a new catalog'
});

export const UpdateCatalogSchema = Type.Object({
  name: Type.Optional(Type.String({ 
    description: 'Updated name of the catalog',
  })),
  description: Type.Optional(Type.String({ 
    description: 'Updated description of the catalog',
  })),
  is_active: Type.Optional(Type.Boolean({ 
    description: 'Whether the catalog is active and visible to customers'
  }))
}, {
  description: 'Data that can be updated for a catalog'
});

// Full catalog representation with nested structure
export const FullCatalogSchema = Type.Object({
  ...CatalogSchema.properties,
  categories: Type.Array(Type.Object({
    ...CategorySchema.properties,
    items: Type.Array(ItemSchema)
  }), { 
    description: 'Categories contained within this catalog' 
  })
}, {
  description: 'Complete catalog with all categories and items'
});

// ------------------- TypeScript Types -------------------

export type Catalog = Static<typeof CatalogSchema>;
export type CreateCatalogRequest = Static<typeof CreateCatalogSchema>;
export type UpdateCatalogRequest = Static<typeof UpdateCatalogSchema>;
export type FullCatalog = Static<typeof FullCatalogSchema>;

// ------------------- API Route Schemas -------------------

// Catalog endpoints
export const getCatalogsSchema: FastifySchema = {
  response: {
    200: Type.Object({
      catalogs: Type.Array(CatalogSchema, {
        description: 'List of catalogs available to the partner'
      })
    })
  },
  description: 'Get all catalogs for a partner',
  tags: ['Partner Catalogs'],
  summary: 'List all catalogs'
};

export const getCatalogSchema: FastifySchema = {
  params: Type.Object({
    catalog_id: Type.Number({ description: 'ID of the catalog to retrieve' })
  }),
  response: {
    200: CatalogSchema
  },
  description: 'Retrieve details for a specific catalog',
  tags: ['Partner Catalogs'],
  summary: 'Get catalog by ID'
};

export const getFullCatalogSchema: FastifySchema = {
  params: Type.Object({
    partner_id: Type.Number({ description: 'ID of the partner whose catalogs to retrieve' })
  }),
  response: {
    200: Type.Object({
      catalogs: Type.Array(FullCatalogSchema, {
        description: 'Complete list of catalogs with all categories and items'
      })
    })
  },
  description: 'Get all catalogs with their complete structure of categories and items',
  tags: ['Partner Catalogs'],
  summary: 'Get detailed catalogs'
};

export const createCatalogSchema: FastifySchema = {
  params: Type.Object({
    partner_id: Type.Number({ description: 'ID of the partner who will own the catalog' })
  }),
  body: CreateCatalogSchema,
  response: {
    201: CatalogSchema
  },
  description: 'Create a new catalog for a partner',
  tags: ['Partner Catalogs'],
  summary: 'Create catalog'
};

export const updateCatalogSchema: FastifySchema = {
  params: Type.Object({
    catalog_id: Type.Number({ description: 'ID of the catalog to update' })
  }),
  body: UpdateCatalogSchema,
  response: {
    200: CatalogSchema
  },
  description: 'Update an existing catalog',
  tags: ['Partner Catalogs'],
  summary: 'Update catalog'
};

export const deleteCatalogSchema: FastifySchema = {
  params: Type.Object({
    catalog_id: Type.Number({ description: 'ID of the catalog to delete' })
  }),
  response: {
    204: Type.Null()
  },
  description: 'Delete a specific catalog',
  tags: ['Partner Catalogs'],
  summary: 'Delete catalog'
};

// Schema for deleting catalog by partner_id
export const deleteCatalogByCatalogIdSchema: FastifySchema = {
  params: Type.Object({
    catalog_id: Type.Number({ description: 'ID of the catalog to delete'  })
  }),
  response: {
    204: Type.Null()
  },
  description: 'Delete a specific catalog by its ID',
  tags: ['Partner Catalogs'],
  summary: 'Delete partner catalogs'
};