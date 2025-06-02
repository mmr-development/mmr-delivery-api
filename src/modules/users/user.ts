export interface CreateCustomerUserRequest {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
}

export interface CreatePartnerUserRequest {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
}

export interface CreateCustomerUserRequestWithoutPassword {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
}

export interface CreateAnonymousUserRequest {
    first_name: string
    last_name: string;
    email: string;
    phone_number: string;
}
