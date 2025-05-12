import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface EmployeeTable {
    id: Generated<number>;
    user_id: string;
    vehicle_type_id: number;
    address_id: number;
    schedule_preference_id: number;
    hours_preference_id: number;
    data_retention_consent: boolean;
    is_eighteen_plus: boolean;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export interface EmployeeWithRelationsRow  {
    id: number;
    user_id: string;
    vehicle_type_id: number;
    address_id: number;
    schedule_preference_id: number;
    hours_preference_id: number;
    hours_preference_name: string;
    data_retention_consent: boolean;
    schedule_preference_name: string;
    is_eighteen_plus: boolean;
    created_at?: string;
    updated_at?: string;
    // User fields
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    // Vehicle type fields
    vehicle_type_name: string;
    address_detail: string;
    street_name: string;
    postal_code: string;
    city_name: string;
    country_name: string;
    country_iso: string;
    employee_documentation: {
        id: number;
        document_type: string;
        document_number: string;
        issue_date: Date;
        expiry_date: Date;
        verification_status: string;
        verified_by: string | null;
        verification_date: Date | null;
        document_url: string;
    }[];
}

export type EmployeeRow = Selectable<EmployeeTable>;
export type InsertableEmployeeRow = Insertable<EmployeeTable>;
export type UpdateableEmployeeRow = Updateable<EmployeeTable>;
