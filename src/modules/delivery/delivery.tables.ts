import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export type DeliveryStatus = 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'canceled';

export interface DeliveryTable {
    id: Generated<number>;
    order_id: number;
    courier_id: string;
    status: DeliveryStatus;
    assigned_at: Generated<Date>;
    accepted_at: Date | null;
    picked_up_at: Date | null;
    delivered_at: Date | null;
    estimated_delivery_time: Date | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export interface CourierLocationTable {
    id: Generated<number>;
    courier_id: string;
    latitude: number;
    longitude: number;
    timestamp: Generated<Date>;
}

export interface CourierAvailabilityTable {
    id: Generated<number>;
    courier_id: string;
    city_id: number | null;
    is_available: boolean;
    is_working: boolean;
    last_status_change: Generated<Date>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type DeliveryRow = Selectable<DeliveryTable>;
export type InsertableDeliveryRow = Insertable<DeliveryTable>;
export type UpdateableDeliveryRow = Updateable<DeliveryTable>;

export type CourierLocationRow = Selectable<CourierLocationTable>;
export type InsertableCourierLocationRow = Insertable<CourierLocationTable>;
export type UpdateableCourierLocationRow = Updateable<CourierLocationTable>;

export type CourierAvailabilityRow = Selectable<CourierAvailabilityTable>;
export type InsertableCourierAvailabilityRow = Insertable<CourierAvailabilityTable>;
export type UpdateableCourierAvailabilityRow = Updateable<CourierAvailabilityTable>;

// Response types
export interface DeliveryWithOrderDetails {
    delivery_id: number;
    order_id: number;
    status: DeliveryStatus;
    restaurant_name: string;
    restaurant_address: string;
    restaurant_latitude: number;
    restaurant_longitude: number;
    customer_address: string;
    customer_latitude: number;
    customer_longitude: number;
    estimated_delivery_time: Date | null;
    created_at: Date;
}

export interface CourierLocation {
    courier_id: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
}
