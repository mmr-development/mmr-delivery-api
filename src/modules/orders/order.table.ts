import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import { DeliveryType, OrderStatus, PaymentMethod } from './order.schema';

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

export type OrderBasicInfo = {
    order_id: number;
    partner_id: number;
    delivery_type: DeliveryType;
    status: OrderStatus;
    requested_delivery_time: Date;
    tip_amount: number | string;
    total_amount: number | string;
    note: string | null;
    created_at: Date;
    updated_at: Date;
};

export type CustomerInfo = {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
};

export type AddressInfo = {
    country: string;
    city: string;
    street: string;
    postal_code: string;
    address_detail: string;
};

export type OrderItemInfo = {
    catalog_item_id: number;
    quantity: number;
    item_note: string | null;
    price: number;
    item_name: string;
};

export type PaymentInfo = {
    payment_method: PaymentMethod;
};

// Compose types based on API needs
export type OrderSummary = OrderBasicInfo & {
    total_items: number;
};

export type OrderWithCustomer = OrderSummary & CustomerInfo;

export type OrderWithAddress = OrderSummary & AddressInfo;

export type OrderWithItems = OrderSummary & {
    items: OrderItemInfo[];
};

export type OrderWithPayment = OrderSummary & PaymentInfo;

// Keep the full type for backward compatibility
export type OrderWithDetailsRow = OrderBasicInfo & CustomerInfo & AddressInfo & PaymentInfo & {
    total_items: number;
    items: OrderItemInfo[];
};

export type OrderRow = Selectable<OrderTable>;
export type InsertableOrderRow = Insertable<OrderTable>;
export type UpdateableOrderRow = Updateable<OrderTable>;

export type OrderItemRow = Selectable<OrderItemTable>;
export type InsertableOrderItemRow = Insertable<OrderItemTable>;
export type UpdateableOrderItemRow = Updateable<OrderItemTable>;

