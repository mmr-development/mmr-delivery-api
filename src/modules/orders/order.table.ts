import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface OrderTable {
    id: Generated<number>;
    partner_id: number;
    customer_id: number;
    order_status: string;
    delivery_type: string;
    requested_delivery_time: Date;
    tip_amount: string | number;
    total_amount: string | number;
    customer_note: string | null;
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

export type OrderRow = Selectable<OrderTable>;
export type InsertableOrderRow = Insertable<OrderTable>;
export type UpdateableOrderRow = Updateable<OrderTable>;

export type OrderItemRow = Selectable<OrderItemTable>;
export type InsertableOrderItemRow = Insertable<OrderItemTable>;
export type UpdateableOrderItemRow = Updateable<OrderItemTable>;
