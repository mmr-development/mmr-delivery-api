
export interface Partner {
    id: number;
    name: string;
    delivery_method_id: number;
    business_type_id: number;
    user_id: string;
}

export interface ContactPerson {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
}

export interface Business {
    name: string
}

export interface PartnerApplicationRequest {
    contact_person: ContactPerson;
    business: Business;
    delivery_method_id: number;
    business_type_id: number;
}

export interface PartnerWithRelations {
    id: number;
    name: string;
    business_type: {
        id: number | null;
        name: string | null;
    };
    delivery_method: {
        id: number | null;
        name: string | null;
    };
    owner: {
        id: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone_number: string | null;
    };
}