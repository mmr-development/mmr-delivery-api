import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createType('delivery_status')
        .asEnum([
            'assigned',
            'picked_up',
            'in_transit',
            'delivered',
            'failed',
            'canceled'
        ])
        .execute();

    await db.schema.createTable('delivery')
        .addColumn('id', 'serial', col => col.primaryKey())
        .addColumn('order_id', 'integer', col => col.notNull().references('order.id').onDelete('cascade'))
        .addColumn('courier_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
        .addColumn('status', sql`delivery_status`, col => col.notNull().defaultTo('assigned'))
        .addColumn('assigned_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
        .addColumn('picked_up_at', 'timestamp')
        .addColumn('delivered_at', 'timestamp')
        .addColumn('estimated_delivery_time', 'timestamp')
        .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
        .execute();
        
    await db.schema.createTable('courier_location')
        .addColumn('id', 'serial', col => col.primaryKey())
        .addColumn('courier_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
        .addColumn('latitude', 'decimal', col => col.notNull())
        .addColumn('longitude', 'decimal', col => col.notNull())
        .addColumn('timestamp', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
        // .addIndex('idx_courier_location_courier_id', ['courier_id'])
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('courier_location').execute();
    await db.schema.dropTable('delivery').execute();
    await db.schema.dropType('delivery_status').execute();
}
