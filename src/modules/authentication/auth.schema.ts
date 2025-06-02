import { FastifySchema } from 'fastify';
import { Static, Type } from '@sinclair/typebox';

// User credentials for login
export const LoginCredentialsSchema = Type.Object({
    email: Type.String({
        format: 'email',
        description: 'User email address',
        examples: ['user@example.com']
    }),
    password: Type.String({
        minLength: 8,
        description: 'User password',
    })
}, { 
    additionalProperties: false,
    description: 'Credentials required for user login'
});

export const LoginQueryParamsSchema = Type.Object({
    client_id: Type.Optional(Type.String({
      description: 'Client application identifier'
    }))
  });

export const UserSchema = Type.Object({
    id: Type.String({
        description: 'Unique identifier for the user',
    }),
    email: Type.String({ format: 'email' }),
    first_name: Type.String(),
    last_name: Type.String()
});

export const LoginResponseSchema = Type.Object({
    access_token: Type.String({ 
        description: 'JWT access token',
        examples: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...']
    }),
    refresh_token: Type.String({ 
        description: 'JWT refresh token for obtaining a new access token',
        examples: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...']
    }),
}, { description: 'Tokens returned after successful login' });

export const ErrorResponseSchema = Type.Object({
    statusCode: Type.Number(),
    error: Type.String(),
    message: Type.String()
});

// Refresh token request
export const RefreshTokenRequestSchema = Type.Object({
    refresh_token: Type.Optional(Type.String({ 
        description: 'Refresh token received from login (not required when using HTTP-only cookies)' 
    }))
});
// Refresh token response
export const RefreshTokenResponseSchema = Type.Object({
    access_token: Type.String(),
    refresh_token: Type.String(),
});

// Logout request schema
export const LogoutRequestSchema = Type.Object({
    refresh_token: Type.Optional(Type.String({ 
        description: 'Refresh token to invalidate (not required when using HTTP-only cookies)' 
    }))
});


// Logout response
export const LogoutResponseSchema = Type.Object({
    message: Type.String()
});

// TypeScript types
export type LoginCredentials = Static<typeof LoginCredentialsSchema>;
export type User = Static<typeof UserSchema>;
export type LoginResponse = Static<typeof LoginResponseSchema>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;
export type RefreshTokenRequest = Static<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = Static<typeof RefreshTokenResponseSchema>;
export type LogoutRequest = Static<typeof LogoutRequestSchema>;
export type LogoutResponse = Static<typeof LogoutResponseSchema>;

// Fastify schemas for routes
export const loginSchema: FastifySchema = {
    summary: 'User login',
    description: 'Authenticate user and retrieve access and refresh tokens.',
    tags: ['Authentication'],
    body: LoginCredentialsSchema,
    querystring: LoginQueryParamsSchema,
    response: {
        200: LoginResponseSchema,
        // 400: ErrorResponseSchema,
        // 401: ErrorResponseSchema
    }
};

export const refreshTokenSchema: FastifySchema = {
    description: 'Refreshes an expired access token',
    tags: ['Authentication'],
    body: RefreshTokenRequestSchema,
    response: {
        200: RefreshTokenResponseSchema,
        401: ErrorResponseSchema
    }
};

export const logoutSchema: FastifySchema = {
    description: 'Logs out a user by invalidating their refresh token',
    tags: ['Authentication'],
    body: LogoutRequestSchema,
    response: {
        200: LogoutResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema
    },
    security: [{ bearerAuth: [] }]
};

export const ForgotPasswordRequestSchema = Type.Object({
    email: Type.String({
        format: 'email',
        description: 'Email address to send password reset link'
    })
});

// Forgot password response
export const ForgotPasswordResponseSchema = Type.Object({
    message: Type.String({ description: 'Confirmation message' })
});

// Reset password request
export const ResetPasswordRequestSchema = Type.Object({
    password: Type.String({
        minLength: 8,
        description: 'New password'
    }),
    confirm_password: Type.String({
        minLength: 8,
        description: 'Confirm new password'
    })
}, {
    additionalProperties: false
});

// Reset password URL params
export const ResetPasswordParamsSchema = Type.Object({
    token: Type.String({ description: 'Password reset token' }),
});

// Reset password response
export const ResetPasswordResponseSchema = Type.Object({
    message: Type.String({ description: 'Password reset confirmation' })
});

// TypeScript types
export type ForgotPasswordRequest = Static<typeof ForgotPasswordRequestSchema>;
export type ForgotPasswordResponse = Static<typeof ForgotPasswordResponseSchema>;
export type ResetPasswordRequest = Static<typeof ResetPasswordRequestSchema>;
export type ResetPasswordParams = Static<typeof ResetPasswordParamsSchema>;
export type ResetPasswordResponse = Static<typeof ResetPasswordResponseSchema>;

// Fastify schemas for routes
export const forgotPasswordSchema: FastifySchema = {
    description: 'Request a password reset link',
    tags: ['Authentication'],
    body: ForgotPasswordRequestSchema,
    response: {
        200: ForgotPasswordResponseSchema,
        400: ErrorResponseSchema
    }
};

export const resetPasswordSchema: FastifySchema = {
    description: 'Reset password using token',
    tags: ['Authentication'],
    params: ResetPasswordParamsSchema,
    body: ResetPasswordRequestSchema,
    response: {
        // 200: ResetPasswordResponseSchema,
        // 400: ErrorResponseSchema,
        // 401: ErrorResponseSchema
    }
};

// Change password request
export const ChangePasswordRequestSchema = Type.Object({
    current_password: Type.String({
        minLength: 8,
        description: 'Current password'
    }),
    new_password: Type.String({
        minLength: 8,
        description: 'New password'
    }),
    confirm_password: Type.String({
        minLength: 8,
        description: 'Confirm new password'
    })
}, {
    additionalProperties: false
});

export const ChangePasswordResponseSchema = Type.Object({
    message: Type.String({ description: 'Password change confirmation' })
});

export type ChangePasswordRequest = Static<typeof ChangePasswordRequestSchema>;
export type ChangePasswordResponse = Static<typeof ChangePasswordResponseSchema>;

export const changePasswordSchema: FastifySchema = {
    description: 'Change user password',
    tags: ['Authentication'],
    body: ChangePasswordRequestSchema,
    response: {
        200: ChangePasswordResponseSchema,
        // 400: ErrorResponseSchema,
        // 401: ErrorResponseSchema,
        // 403: ErrorResponseSchema
    },
    security: [{ bearerAuth: [] }]
};

export const SignupRequestSchema = Type.Object({
    first_name: Type.String({
        minLength: 1,
        description: 'User first name'
    }),
    last_name: Type.String({
        minLength: 1,
        description: 'User last name'
    }),
    email: Type.String({
        format: 'email',
        description: 'User email address'
    }),
    phone_number: Type.Optional(Type.String({
        description: 'User phone number'
    })),
    password: Type.String({
        minLength: 8,
        description: 'User password'
    }),
}, { additionalProperties: false });

// Signup response schema
export const SignupResponseSchema = Type.Object({
    message: Type.String({ description: 'Signup confirmation message' }),
    user: UserSchema
});

// TypeScript types
export type SignupRequest = Static<typeof SignupRequestSchema>;
export type SignupResponse = Static<typeof SignupResponseSchema>;

// Fastify schema for the route
export const signupSchema: FastifySchema = {
    description: 'Register a new user account',
    tags: ['Authentication'],
    body: SignupRequestSchema,
    response: {
        201: SignupResponseSchema,
        400: ErrorResponseSchema,
        409: ErrorResponseSchema
    }
};