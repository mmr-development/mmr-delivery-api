import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface PartnerTable {
    id: Generated<number>;
    name: string;
    phone_number: string;
    status: string | null;
    logo_url: string | null;
    banner_url: string | null;
    delivery_fee: number | string | null;
    min_order_value: number | string | null;
    min_preparation_time_minutes: number | string | null;
    max_preparation_time_minutes: number | string | null;
    max_delivery_distance_km: number | string | null;
    smiley_image_url: string | null;
    smiley_report_link: string | null;
    delivery_method_id: number;
    business_type_id: number;
    user_id: string;
    address_id: number;
}

export type PartnerRow = Selectable<PartnerTable>;
export type InsertablePartnerRow = Insertable<PartnerTable>;
export type UpdateablePartnerRow = Updateable<PartnerTable>;

export interface PartnerDataModel {
  id: number;
  name: string;
  status: string | null;
  address_id: number;
  street: string;
  city: string;
  postal_code: string;
  address_detail: string | null;
}

export interface PartnerWithRelationsRow {
    id: number;
    name: string;
    status: string | null;
    business_type_id: number | null;
    business_type_name: string | null;
    delivery_method_id: number | null; 
    delivery_method_name: string | null;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    user_email: string | null;
    phone_number: string | null;
    address_id: number | null;
    street: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    address_detail: string | null;
    // created_at: Generated<Date>;
    // updated_at: Generated<Date>;
}
