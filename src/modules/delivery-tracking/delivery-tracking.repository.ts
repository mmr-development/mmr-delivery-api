import { Kysely } from 'kysely';
import { Database } from '../../database';
import { DeliveryTrackingRow, InsertableDeliveryTrackingRow } from './delivery-tracking.table';

export interface DeliveryTrackingRepository {
  saveLocation(location: InsertableDeliveryTrackingRow): Promise<DeliveryTrackingRow>;
  getLatestLocation(order_id: number): Promise<DeliveryTrackingRow | undefined>;
}

export function createDeliveryTrackingRepository(db: Kysely<Database>): DeliveryTrackingRepository {
  return {
    async saveLocation(location) {
      return await db.insertInto('delivery_tracking')
        .values(location)
        .returningAll()
        .executeTakeFirstOrThrow();
    },
    async getLatestLocation(order_id) {
      return await db.selectFrom('delivery_tracking')
        .selectAll()
        .where('order_id', '=', order_id)
        .limit(1)
        .executeTakeFirst();
    }
  };
}