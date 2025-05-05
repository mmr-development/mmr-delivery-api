import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('catalog_item')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('catalog_category_id', 'integer', (col) => col.notNull().references('catalog_category.id').onDelete('cascade'))
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('description', 'text', (col) => col.notNull())
        .addColumn('price', 'decimal', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('catalog_item').execute();
}
