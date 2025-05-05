import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('catalog_category')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('catalog_id', 'integer', (col) => col.notNull().references('catalog.id').onDelete('cascade'))
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('catalog_category').execute();
}
