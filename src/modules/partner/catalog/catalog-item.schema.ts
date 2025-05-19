import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// ------------------- Type Definitions -------------------

// Item Types
export const ItemSchema = Type.Object({
  id: Type.Number({ 
    description: 'Unique identifier for the category item' 
  }),
  catalog_category_id: Type.Number({ 
    description: 'ID of the category this item belongs to' 
  }),
  name: Type.String({ 
    description: 'Name of the item displayed to customers',
    examples: ['Margherita Pizza', 'Caesar Salad', 'Chocolate Cake']
  }),
  description: Type.String({ 
    description: 'Detailed description of the item',
    examples: ['Fresh mozzarella, tomato sauce, and basil on our signature crust']
  }),
  price: Type.Number({ 
    description: 'Price of the item in the smallest currency unit (e.g. cents)',
    examples: [1299, 899, 599]
  }),
  index: Type.Number({ 
    description: 'Display order of the item within the category',
    examples: [0, 1, 2]
  }),
  image_url: Type.Optional(Type.String({ 
    description: 'URL to the item\'s image',
    examples: ['https://example.com/images/margherita.jpg']
  })),
//   is_available: Type.Boolean(),
  created_at: Type.String({ 
    format: 'date-time',
    description: 'Date and time when the item was created'
  }),
  updated_at: Type.String({ 
    format: 'date-time',
    description: 'Date and time when the item was last updated'
  })
}, {
  description: 'Represents a menu item within a catalog category'
});

export const CreateItemSchema = Type.Object({
  name: Type.String({
    description: 'Name of the item to create',
    examples: ['Greek Salad', 'Tiramisu', 'Chicken Wings'],
    minLength: 1,
    maxLength: 100
  }),
  description: Type.String({
    description: 'Detailed description of the item',
    examples: ['Fresh cucumbers, tomatoes, olives, and feta cheese with olive oil'],
    maxLength: 500
  }),
  price: Type.Number({
    description: 'Price of the item in the smallest currency unit (e.g. cents)',
    examples: [1099, 799],
    minimum: 0
  }),
  image_url: Type.Optional(Type.String({
    description: 'URL to the item\'s image',
    examples: ['https://example.com/images/greek-salad.jpg'],
    format: 'uri'
  })),
//   is_available: Type.Optional(Type.Boolean())
}, {
  description: 'Data required to create a new menu item'
});

export const UpdateItemSchema = Type.Object({
  name: Type.Optional(Type.String({
    description: 'Updated name for the item',
    examples: ['Classic Greek Salad', 'Homemade Tiramisu'],
    minLength: 1,
    maxLength: 100
  })),
  description: Type.Optional(Type.String({
    description: 'Updated description for the item',
    examples: ['Our classic recipe with imported ingredients'],
    maxLength: 500
  })),
  price: Type.Optional(Type.Number({
    description: 'Updated price in the smallest currency unit',
    examples: [1199, 899],
    minimum: 0
  })),
  image_url: Type.Optional(Type.String({
    description: 'Updated URL to the item\'s image',
    examples: ['https://example.com/images/updated-item.jpg'],
  })),
  index: Type.Optional(Type.Number({
    description: 'Updated display order of the item within the category',
    examples: [0, 1, 2]
  })),
//   is_available: Type.Optional(Type.Boolean())
}, {
  description: 'Data that can be updated for a menu item'
});

// ------------------- TypeScript Types -------------------

export type Item = Static<typeof ItemSchema>;
export type CreateItemRequest = Static<typeof CreateItemSchema>;
export type UpdateItemRequest = Static<typeof UpdateItemSchema>;

// ------------------- API Route Schemas -------------------

export const getItemsSchema: FastifySchema = {
  params: Type.Object({
    category_id: Type.Number({
      description: 'ID of the category whose items to retrieve'
    })
  }),
  response: {
    200: Type.Object({
      items: Type.Array(ItemSchema, {
        description: 'List of items in the category'
      })
    })
  },
  description: 'Get all items for a specific category',
  tags: ['Partner Category Items'],
  summary: 'List all items in a category'
};

export const getItemSchema: FastifySchema = {
  params: Type.Object({
    item_id: Type.Number({
      description: 'ID of the item to retrieve'
    })
  }),
  response: {
    200: ItemSchema
  },
  description: 'Get details for a specific item',
  tags: ['Partner Category Items'],
  summary: 'Get item by ID'
};

export const createItemSchema: FastifySchema = {
  params: Type.Object({
    category_id: Type.Number({
      description: 'ID of the category to add an item to'
    })
  }),
  body: CreateItemSchema,
  response: {
    201: ItemSchema
  },
  description: 'Create a new item in a category',
  tags: ['Partner Category Items'],
  summary: 'Create item'
};

export const updateItemSchema: FastifySchema = {
  params: Type.Object({
    item_id: Type.Number({
      description: 'ID of the item to update'
    })
  }),
  body: UpdateItemSchema,
  response: {
    200: ItemSchema
  },
  description: 'Update an existing item',
  tags: ['Partner Category Items'],
  summary: 'Update item'
};

export const deleteItemSchema: FastifySchema = {
  params: Type.Object({
    item_id: Type.Number({
      description: 'ID of the item to delete'
    })
  }),
  response: {
    204: Type.Null()
  },
  description: 'Delete a specific item',
  tags: ['Partner Category Items'],
  summary: 'Delete item'
};