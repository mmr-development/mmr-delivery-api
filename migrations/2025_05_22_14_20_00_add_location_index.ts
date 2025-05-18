import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add index to courier location table to speed up location queries
  await db.schema
    .createIndex('idx_courier_location_courier_id_timestamp')
    .on('courier_location')
    .columns(['courier_id', 'timestamp'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex('idx_courier_location_courier_id_timestamp')
    .execute();
}
