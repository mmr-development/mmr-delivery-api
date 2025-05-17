import { Static, Type } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

export const UserSchema = Type.Object(
    {
        id: Type.String({
            description: 'Unique identifier for the user',
        }),
        email: Type.String({
            format: 'email',
            description: 'User\'s email address',
        }),
        phone_number: Type.Optional(Type.String({
            description: 'User\'s phone number',
        })),
        first_name: Type.Optional(Type.String({
            maxLength: 100,
            description: 'User\'s first name',
        })),
        last_name: Type.Optional(Type.String({
            maxLength: 100,
            description: 'User\'s last name',
        })),
        created_at: Type.String({
            format: 'date-time',
            description: 'Date and time when the user was created',
        }),
        updated_at: Type.String({
            format: 'date-time',
            description: 'Date and time when the user was last updated',
        }),
        roles: Type.Optional(Type.Array(
            Type.Object({
                id: Type.String({
                    description: 'Unique identifier for the role',
                }),
                name: Type.String({
                    description: 'Name of the role',
                }),
                description: Type.Optional(Type.String({
                    description: 'Description of the role',
                })),
            }),
            {
                description: 'List of roles assigned to the user',
            },
        )),
    },
);

export type User = Static<typeof UserSchema>;

export const PaginationQuerySchema = Type.Object(
    {
        offset: Type.Optional(Type.Number({
            minimum: 0,
            default: 0,
            description: 'Number of items to skip',
        })),
        limit: Type.Optional(Type.Number({
            minimum: 1,
            description: 'Maximum number of items to return',
        }))
    },
);

export const UserSearchQuerySchema = Type.Intersect([
    PaginationQuerySchema,
    Type.Object({
        email: Type.Optional(Type.String({
            format: 'email',
            description: 'Filter users by exact email address',
        })),
        name: Type.Optional(Type.String({
            description: 'Filter users by name (searches both first and last name)',
        })),
        phone_number: Type.Optional(Type.String({
            description: 'Filter users by exact phone number',
        }))
    })
]);

export const UsersResponseSchema = Type.Object(
    {
        users: Type.Array(UserSchema, {
            description: 'List of users in the system'
        }),
        pagination: Type.Optional(Type.Object(
            {
                total: Type.Optional(Type.Number({
                    description: 'Total number of users available',
                })),
                offset: Type.Optional(Type.Number({
                    description: 'Current offset (number of users skipped)',
                })),
                limit: Type.Optional(Type.Number({
                    description: 'Current limit (maximum number of users returned)',
                }))
            },
        ))
    },
);

export const getAllUsersSchema = {
    querystring: UserSearchQuerySchema,
    response: {
        200: UsersResponseSchema
    },
    description: 'Retrieve users with optional pagination',
    tags: ['Users'],
    summary: 'Get users',
    security: [{ bearerAuth: [] }],
};

export const UserByIdParamsSchema = Type.Object(
    {
        user_id: Type.String({
            description: 'Unique identifier of the user to retrieve',
        })
    },
);

export const ErrorResponseSchema = Type.Object(
    {
        message: Type.String({
            description: 'Error message',
            examples: ['User not found']
        })
    },
);

export const getUserByIdSchema: FastifySchema = {
    params: UserByIdParamsSchema,
    response: {
        200: UserSchema,
        404: ErrorResponseSchema
    },
    description: 'Retrieve a specific user by ID',
    tags: ['Users'],
    summary: 'Get user by ID',
    security: [{ bearerAuth: [] }],
};
