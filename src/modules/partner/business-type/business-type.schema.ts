import { FastifySchema } from 'fastify';

export const createBusinessTypeSchema: FastifySchema = {
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
        name: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  }
};

export const getBusinessTypesSchema: FastifySchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};

export const getBusinessTypeByIdSchema: FastifySchema = {
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
        name: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
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

export const updateBusinessTypeSchema: FastifySchema = {
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
        name: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
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

export const deleteBusinessTypeSchema: FastifySchema = {
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
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};