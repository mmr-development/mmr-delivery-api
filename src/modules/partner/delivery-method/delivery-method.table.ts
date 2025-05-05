import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface DeliveryMethodTable {
    id: Generated<number>;
    name: string;
}

export type DeliveryMethodRow = Selectable<DeliveryMethodTable>;
export type InsertableDeliveryMethodRow = Insertable<DeliveryMethodTable>;
export type UpdateableDeliveryMethodRow = Updateable<DeliveryMethodTable>;
