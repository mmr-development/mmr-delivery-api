import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// Schema for creating a new employee (courier application)

export const DocumentSchema = Type.Object({
    id: Type.Number(),
    document_type: Type.String({ minLength: 1, maxLength: 50 }),
    document_number: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    issue_date: Type.Optional(Type.String({ format: 'date' })),
    expiry_date: Type.Optional(Type.String({ format: 'date' })),
    verification_status: Type.String({
      enum: ['not_submitted', 'pending', 'verified', 'rejected']
    }),
    verified_by: Type.Optional(Type.String({ format: 'uuid' })),
    verification_date: Type.Optional(Type.String({ format: 'date-time' })),
    document_url: Type.Optional(Type.String()),
    created_at: Type.Optional(Type.String({ format: 'date-time' })),
    updated_at: Type.Optional(Type.String({ format: 'date-time' }))
  });

// Personal details schema (if not already in user data)
export const PersonalDetailsSchema = Type.Object({
    first_name: Type.String({ minLength: 1, maxLength: 100 }),
    last_name: Type.String({ minLength: 1, maxLength: 100 }),
    email: Type.String({ format: 'email' }),
    phone_number: Type.String({ minLength: 5, maxLength: 20 }),
    address: Type.Object({
        street: Type.String({ minLength: 1, maxLength: 255 }),
        address_detail: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
        city: Type.String({ minLength: 1, maxLength: 100 }),
        postal_code: Type.String({ minLength: 1, maxLength: 20 }),
        country: Type.String({ minLength: 1, maxLength: 100 })
    }),
    is_eighteen_plus: Type.Boolean(),
});

// Updated courier application request schema
export const CourierApplicationRequestSchema = Type.Object({
    personal_details: PersonalDetailsSchema,
    schedule_preference: Type.Integer({ minimum: 1 }),
    hours_preference: Type.Integer({ minimum: 1 }),
    vehicle_type_id: Type.Integer({ minimum: 1 }),
    data_retention_consent: Type.Boolean(),
});

// TypeScript types
export type PersonalDetails = Static<typeof PersonalDetailsSchema>;
export type CourierApplicationRequest = Static<typeof CourierApplicationRequestSchema>;

// Schedule preference type - now an integer
export type SchedulePreference = number;

// Hours preference type - now an integer
export type HoursPreference = number;

// Vehicle type
export type VehicleType = 'own_e_bike' | 'own_scooter' | 'own_car';

// The rest of your existing schema...

export const CreateCourierApplicationResponseSchema = Type.Object({
    message: Type.String(),
    id: Type.Number(),
    status: Type.String({
        enum: ['pending', 'documents_requested', 'reviewing', 'approved', 'rejected']
    }),
    next_steps: Type.Optional(Type.String())
});

export const createCourierApplicationSchema: FastifySchema = {
    body: CourierApplicationRequestSchema,
    response: {
        201: CreateCourierApplicationResponseSchema
    },
    tags: ['Courier Applications'],
    description: 'Submit a new courier application',
    summary: 'Create courier application'
};

export type CreateCourierApplicationResponse = Static<typeof CreateCourierApplicationResponseSchema>;

// Response schema for employee data
export const EmployeeResponseSchema = Type.Object({
    id: Type.Number(),
    user: Type.Object({
        id: Type.String({ format: 'uuid' }),
        first_name: Type.String(),
        last_name: Type.String(),
        email: Type.String({ format: 'email' }),
        phone_number: Type.String(),
        is_eighteen_plus: Type.Boolean()
    }),
    vehicle_type: Type.Object({
        id: Type.Number(),
        name: Type.String()
    }),
    schedule_preference: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        description: Type.Optional(Type.String())
    }),
    hours_preference: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        description: Type.Optional(Type.String())
    }),
    address: Type.Object({
        id: Type.Number(),
        address_detail: Type.String(),
        street: Type.String(),
        postal_code: Type.String(),
        city: Type.String(),
        country: Type.String(),
        country_iso: Type.String()
    }),
    documentation: Type.Array(DocumentSchema),
    // application_status: Type.String({
    //     enum: ['pending', 'documents_requested', 'reviewing', 'approved', 'rejected']
    // }),
    // documentation: Type.Array(Type.Object({
    //     // existing documentation fields
    // })),
    // created_at: Type.String({ format: 'date-time' }),
    // updated_at: Type.String({ format: 'date-time' })
});

// Document request schema
export const RequestDocumentsSchema = Type.Object({
    documents: Type.Array(Type.Object({
        document_type: Type.String({ minLength: 1, maxLength: 50 }),
        required: Type.Boolean({ default: true })
    })),
    message: Type.Optional(Type.String()),
    deadline: Type.Optional(Type.String({ format: 'date' }))
});

// Document upload schema
export const UploadDocumentSchema = Type.Object({
    document_type: Type.String({ minLength: 1, maxLength: 50 }),
    document_number: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    issue_date: Type.Optional(Type.String({ format: 'date' })),
    expiry_date: Type.Optional(Type.String({ format: 'date' })),
    document_file: Type.String({ format: 'binary' })
});

// Add new FastifySchema for document-related endpoints
export const requestDocumentsSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number()
    }),
    body: RequestDocumentsSchema,
    response: {
        200: Type.Object({
            message: Type.String(),
            requested_documents: Type.Array(Type.String())
        })
    },
    tags: ['Courier Applications'],
    description: 'Request specific documents from an employee',
    summary: 'Request documents',
    security: [{ bearerAuth: [] }]
};

export const uploadDocumentSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number()
    }),
    body: UploadDocumentSchema,
    consumes: ['multipart/form-data'],
    response: {
        200: Type.Object({
            message: Type.String(),
            document_id: Type.Number()
        })
    },
    tags: ['Courier Applications'],
    description: 'Upload a requested document',
    summary: 'Upload document'
};

// Document types
export type DocumentRequest = Static<typeof RequestDocumentsSchema>;
export type DocumentUpload = Static<typeof UploadDocumentSchema>;
export type EmployeeResponse = Static<typeof EmployeeResponseSchema>;

// Document fields
// export type DocumentInRequest = NonNullable<Static<typeof CourierApplicationRequestSchema>['documentation']>[0];
// export type DocumentInResponse = Static<typeof EmployeeResponseSchema>['documentation'][0];

// For the response schemas in endpoints
export type DocumentRequestResponse = {
    message: string;
    requested_documents: string[];
};

export type DocumentUploadResponse = {
    message: string;
    document_id: number;
};

// User sub-object
export type UserInfo = Static<typeof EmployeeResponseSchema>['user'];

// Vehicle type info
export type VehicleTypeInfo = Static<typeof EmployeeResponseSchema>['vehicle_type'];

// Types for enum values
export type ApplicationStatus = 'pending' | 'documents_requested' | 'reviewing' | 'approved' | 'rejected';
export type VerificationStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

// Get courier application by ID schema
export const getCourierApplicationSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number()
    }),
    response: {
        // 200: CreateCourierApplicationResponseSchema
    },
    tags: ['Courier Applications'],
    description: 'Get a courier application by ID',
    summary: 'Get courier application',
    security: [{ bearerAuth: [] }]
};

// List courier applications schema with filtering options
export const listCourierApplicationsSchema: FastifySchema = {
    // querystring: Type.Object({
    //     status: Type.Optional(Type.String({
    //         enum: ['pending', 'documents_requested', 'reviewing', 'approved', 'rejected']
    //     })),
    //     page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    //     limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 })),
    //     sort: Type.Optional(Type.String({ default: 'created_at' })),
    //     order: Type.Optional(Type.String({ enum: ['asc', 'desc'], default: 'desc' }))
    // }),
    response: {
        200: Type.Object({
            applications: Type.Array(EmployeeResponseSchema),
        })
    },
    tags: ['Courier Applications'],
    description: 'List all courier applications with filtering options',
    summary: 'List courier applications',
    security: [{ bearerAuth: [] }]
};

// Update courier application status schema
export const updateApplicationStatusSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number()
    }),
    body: Type.Object({
        status: Type.String({
            enum: ['pending', 'documents_requested', 'reviewing', 'approved', 'rejected']
        }),
        notes: Type.Optional(Type.String())
    }),
    response: {
        200: Type.Object({
            message: Type.String(),
            id: Type.Number(),
            status: Type.String()
        })
    },
    tags: ['Courier Applications'],
    description: 'Update the status of a courier application',
    summary: 'Update application status',
    security: [{ bearerAuth: [] }]
};

// Update courier application details schema
export const updateCourierApplicationSchema: FastifySchema = {
    params: Type.Object({
        id: Type.Number()
    }),
    body: Type.Object({
        schedule_preference: Type.Optional(Type.Integer({ minimum: 1 })),
        hours_preference: Type.Optional(Type.Integer({ minimum: 1 })),
        vehicle_type_id: Type.Optional(Type.Integer({ minimum: 1 })),
        personal_details: Type.Optional(Type.Object({
            phone_number: Type.Optional(Type.String({ minLength: 5, maxLength: 20 })),
            address: Type.Optional(Type.Object({
                street: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
                address_detail: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
                city: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
                postal_code: Type.Optional(Type.String({ minLength: 1, maxLength: 20 })),
                country: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
            }))
        }))
    }),
    response: {
        200: Type.Object({
            message: Type.String(),
            id: Type.Number()
        })
    },
    tags: ['Courier Applications'],
    description: 'Update courier application details',
    summary: 'Update courier application',
    security: [{ bearerAuth: [] }]
};

export const deleteCourierApplicationSchema: FastifySchema = {
    params: Type.Object({
      id: Type.Number()
    }),
    response: {
      200: Type.Object({
        message: Type.String(),
        id: Type.Number()
      })
    },
    tags: ['Courier Applications'],
    description: 'Delete or withdraw a courier application',
    summary: 'Delete courier application',
    security: [{ bearerAuth: [] }]
  };