import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface PartnerTable {
    id: Generated<number>;
    name: string;
    delivery_method_id: number;
    business_type_id: number;
    user_id: string;
    // primary_address_id: number;
}

export type PartnerRow = Selectable<PartnerTable>;
export type InsertablePartnerRow = Insertable<PartnerTable>;
export type UpdateablePartnerRow = Updateable<PartnerTable>;

export interface PartnerWithRelationsRow {
    id: number;
    name: string;
    business_type_id: number | null;
    business_type_name: string | null;
    delivery_method_id: number | null; 
    delivery_method_name: string | null;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    user_email: string | null;
    phone_number: string | null;
}
