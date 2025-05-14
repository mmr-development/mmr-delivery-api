import { Generated, Insertable, Selectable } from 'kysely';

export interface DeliveryTrackingTable {
  id: Generated<number>;
  order_id: number;
  courier_id: string;
}

export type DeliveryTrackingRow = Selectable<DeliveryTrackingTable>;
export type InsertableDeliveryTrackingRow = Insertable<DeliveryTrackingTable>;
