import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('address')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('street_id', 'integer', (col) => col.notNull().references('street.id').onDelete('cascade'))
        .addColumn('address_detail', 'varchar(255)', (col) => col.notNull())
        .addColumn('postal_code_id', 'integer', (col) => col.notNull().references('postal_code.id').onDelete('cascade'))
        .addColumn('latitude', 'decimal', (col) => col.notNull())
        .addColumn('longitude', 'decimal', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('address').execute();
}
