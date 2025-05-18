import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('delivery')
    .addColumn('pickup_lat', 'decimal', col => col.defaultTo(null))
    .addColumn('pickup_lng', 'decimal', col => col.defaultTo(null))
    .addColumn('delivery_lat', 'decimal', col => col.defaultTo(null))
    .addColumn('delivery_lng', 'decimal', col => col.defaultTo(null))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('delivery')
    .dropColumn('pickup_lat')
    .dropColumn('pickup_lng')
    .dropColumn('delivery_lat')
    .dropColumn('delivery_lng')
    .execute();
}
