import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { ItemSchema } from './catalog-item.schema';

// ------------------- Type Definitions -------------------

export const CategorySchema = Type.Object({
    id: Type.Number({
        description: 'Unique identifier for the catalog category'
    }),
    catalog_id: Type.Number({
        description: 'ID of the parent catalog this category belongs to'
    }),
    name: Type.String({
        description: 'Name of the category displayed to customers',
        examples: ['Appetizers', 'Entrees', 'Desserts']
    }),
    index: Type.Number({
        description: 'Display order of the category within the catalog',
        examples: [0, 1, 2]
    }),
    created_at: Type.String({
        format: 'date-time',
        description: 'Date and time when the category was created'
    }),
    updated_at: Type.String({
        format: 'date-time',
        description: 'Date and time when the category was last updated'
    })
}, {
    description: 'Represents a category within a catalog'
});

export const CreateCategorySchema = Type.Object({
    name: Type.String({
        description: 'Name of the category to create',
        examples: ['Burgers', 'Salads', 'Beverages'],
        minLength: 1,
        maxLength: 100
    })
}, {
    description: 'Data required to create a new category'
});

export const UpdateCategorySchema = Type.Object({
    name: Type.Optional(Type.String({
        description: 'Updated name for the category',
        examples: ['Specialty Burgers', 'Premium Salads']
    })),
    index: Type.Optional(Type.Number({
        description: 'Updated display order of the category within the catalog',
        examples: [0, 1, 2]
    })),
}, {
    description: 'Data that can be updated for a category'
});

// Category with items (for nested responses)
export const CategoryWithItemsSchema = Type.Object({
    ...CategorySchema.properties,
    items: Type.Array(ItemSchema, {
        description: 'Items belonging to this category'
    })
}, {
    description: 'Category with its associated menu items'
});

// ------------------- TypeScript Types -------------------

export type Category = Static<typeof CategorySchema>;
export type CreateCategoryRequest = Static<typeof CreateCategorySchema>;
export type UpdateCategoryRequest = Static<typeof UpdateCategorySchema>;
export type CategoryWithItems = Static<typeof CategoryWithItemsSchema>;

// ------------------- API Route Schemas -------------------

export const getCategoriesSchema: FastifySchema = {
    response: {
        200: Type.Object({
            categories: Type.Array(CategorySchema, {
                description: 'List of categories in the catalog'
            })
        })
    },
    description: 'Get all categories for a specific catalog',
    tags: ['Partner Catalog Categories'],
    summary: 'List all categories'
};

export const getCategorySchema: FastifySchema = {
    params: Type.Object({
        catalog_id: Type.Number({
            description: 'ID of the catalog to retrieve categories from'
        }),
        category_id: Type.Number({
            description: 'ID of the category to retrieve'
        })
    }),
    response: {
        200: CategorySchema
    },
    description: 'Get details for a specific category',
    tags: ['Partner Catalog Categories'],
    summary: 'Get category by ID'
};

export const createCategorySchema: FastifySchema = {
    params: Type.Object({
        catalog_id: Type.Number({
            description: 'ID of the catalog to create a category in'
        })
    }),
    body: CreateCategorySchema,
    response: {
        201: CategorySchema
    },
    description: 'Create a new category in a catalog',
    tags: ['Partner Catalog Categories'],
    summary: 'Create category'
};

export const updateCategorySchema: FastifySchema = {
    params: Type.Object({
        category_id: Type.Number({
            description: 'ID of the category to update'
        })
    }),
    body: UpdateCategorySchema,
    response: {
        200: CategorySchema
    },
    description: 'Update an existing category',
    tags: ['Partner Catalog Categories'],
    summary: 'Update category'
};

export const deleteCategorySchema: FastifySchema = {
    params: Type.Object({
        category_id: Type.Number({
            description: 'ID of the category to delete'
        })
    }),
    response: {
        204: Type.Null()
    },
    description: 'Delete a specific category and all its items',
    tags: ['Partner Catalog Categories'],
    summary: 'Delete category'
};

// Add this schema to your catalog.schema.ts file

export const bulkCreateCategoriesSchema = {
  summary: 'Create multiple categories with items in bulk',
  tags: ['Partner Catalogs'],
  params: {
    type: 'object',
    required: ['catalog_id'],
    properties: {
      catalog_id: { type: 'number' }
    }
  },
  body: {
    type: 'object',
    required: ['categories'],
    properties: {
      categories: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'price'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  price: { type: 'number' },
                  image_url: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              catalog_id: { type: 'number' },
              name: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    catalog_category_id: { type: 'number' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                    image_url: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export interface BulkCategoryItem {
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}

export interface BulkCategory {
  name: string;
  items?: BulkCategoryItem[];
}

export interface BulkCategoriesRequest {
  categories: BulkCategory[];
}