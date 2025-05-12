import { EmployeeRow } from "../employee.table";

export interface Courier {
    id: number;
    user_id: string;
    vehicle_type_id: number;
    address_id: number;
    schedule_preference_id: number | null;
    hours_preference_id: number | null;
    data_retention_consent: boolean;
    is_eighteen_plus: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CourierWithRelationsRow {
    id: number
    user_id: string
    vehicle_type_id: number
    address_id: number
    schedule_preference_id: number | null
    hours_preference_id: number | null
    data_retention_consent: boolean
    is_eighteen_plus: boolean
    // User fields
    first_name: string
    last_name: string
    email: string
    phone_number: string
    // Vehicle type fields
    vehicle_type_name: string
  }
