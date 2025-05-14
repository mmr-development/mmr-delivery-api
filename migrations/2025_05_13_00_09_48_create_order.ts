import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createType('order_status')
        .asEnum([
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'dispatched',
            'delivered',
            'cancelled',
            'failed',
            'refunded'
        ])
        .execute();

    await db.schema
        .createType('order_delivery_type')
        .asEnum(['pickup', 'delivery'])
        .execute();

    await db.schema.createTable('order')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('partner_id', 'integer', (col) => col.notNull().references('partner.id').onDelete('cascade'))
        .addColumn('customer_id', 'integer', (col) => col.notNull().references('customer.id').onDelete('cascade'))
        .addColumn('status', sql`order_status`, (col) => col.notNull())
        .addColumn('delivery_type', sql`order_delivery_type`, (col) => col.notNull())
        .addColumn('requested_delivery_time', 'timestamp', (col) => col.notNull())
        .addColumn('total_amount', 'decimal', (col) => col.notNull())
        .addColumn('tip_amount', 'decimal', (col) => col.defaultTo(0))
        .addColumn('note', 'text', (col) => col.defaultTo(null))
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('order_item')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('order_id', 'integer', (col) => col.notNull().references('order.id').onDelete('cascade'))
        .addColumn('catalog_item_id', 'integer', (col) => col.notNull().references('catalog_item.id').onDelete('cascade'))
        .addColumn('quantity', 'integer', (col) => col.notNull())
        .addColumn('price', 'decimal', (col) => col.notNull())
        .addColumn('note', 'text', (col) => col.defaultTo(null))
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('order_item').execute();
    await db.schema.dropTable('order').execute();
    await db.schema.dropType('order_status').execute();
    await db.schema.dropType('order_delivery_type').execute();
}
