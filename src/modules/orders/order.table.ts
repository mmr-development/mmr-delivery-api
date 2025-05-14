import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface OrderTable {
    id: Generated<number>;
    partner_id: number;
    customer_id: number;
    status: string;
    delivery_type: string;
    requested_delivery_time: Date;
    tip_amount: string | number;
    total_amount: string | number;
    note: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export interface OrderItemTable {
    id: Generated<number>;
    order_id: number;
    catalog_item_id: number;
    quantity: number;
    price: number;
    note: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type OrderWithDetailsRow = {
    order_id: number;
    partner_id: number;
    delivery_type: string;
    status: string;
    requested_delivery_time: Date;
    tip_amount: number | string;
    total_amount: number | string;
    total_items: number;
    note: string | null;
    created_at: Date;
    updated_at: Date;
    // Customer fields
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    // // Address fields
    country: string;
    city: string;
    street: string;
    postal_code: string;
    address_detail: string | null;
    // latitude: number | null;
    // longitude: number | null;
    // // Order item fields
   items: {
        catalog_item_id: number;
        quantity: number;
        item_note: string | null;
        price: number;
        item_name: string;
    }[];
    // // Payment fields
    payment_method: string | null;
  };

export type OrderRow = Selectable<OrderTable>;
export type InsertableOrderRow = Insertable<OrderTable>;
export type UpdateableOrderRow = Updateable<OrderTable>;

export type OrderItemRow = Selectable<OrderItemTable>;
export type InsertableOrderItemRow = Insertable<OrderItemTable>;
export type UpdateableOrderItemRow = Updateable<OrderItemTable>;

