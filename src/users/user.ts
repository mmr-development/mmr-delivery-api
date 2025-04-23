
export interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
}

export interface CreateCustomerUserRequest {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    // marketing_consent: boolean;
}