import { FastifySchema } from 'fastify';

// Schema for creating/updating a fulfillment type
export const createDeliveryMethodSchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 }
    },
    required: ['name'],
    additionalProperties: false
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    }
  }
};

// Schema for getting all fulfillment types
export const getDeliveryMethodsSchema: FastifySchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        }
      }
    }
  }
};

// Schema for getting a single fulfillment type
export const getDeliveryMethodByIdSchema: FastifySchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer', minimum: 1 }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

// Schema for updating a fulfillment type
export const updateDeliveryMethodSchema: FastifySchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer', minimum: 1 }
    },
    required: ['id']
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 }
    },
    required: ['name'],
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    }
  }
};

// Schema for deleting a fulfillment type
export const deleteDeliveryMethodSchema: FastifySchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer', minimum: 1 }
    },
    required: ['id']
  },
  response: {
    204: {
      type: 'null'
    }
  }
};