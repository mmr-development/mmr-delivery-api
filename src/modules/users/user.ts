export interface CreateCustomerUserRequest {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
    // marketing_consent: boolean;
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
