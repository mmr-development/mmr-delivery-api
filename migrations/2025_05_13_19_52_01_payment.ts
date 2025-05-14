import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createType('payment_status')
        .asEnum([
            'pending',
            'completed',
            'failed',
        ])
        .execute();

    await db.schema
        .createType('payment_method')
        .asEnum([
            'credit_card',
            'debit_card',
            'paypal',
            'mobile_pay',
        ])
        .execute();

    await db.schema.createTable('payment')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('order_id', 'integer', (col) => col.notNull().references('order.id').onDelete('cascade'))
        .addColumn('payment_status', sql`payment_status`, (col) => col.notNull())
        .addColumn('payment_method', sql`payment_method`, (col) => col.notNull())
        .addColumn('transaction_id', 'text', (col) => col.defaultTo(null))
        .addColumn('transaction_data', 'jsonb', (col) => col.defaultTo('{}'))
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('payment').execute();
    await db.schema.dropType('payment_status').execute();
    await db.schema.dropType('payment_method').execute();
}
