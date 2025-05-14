import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('catalog')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('partner_id', 'integer', (col) => col.notNull().references('partner.id').onDelete('cascade'))
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('description', 'text')
        .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createIndex('one_active_catalog_per_partner')
        .on('catalog')
        .column('partner_id')
        .where(sql.ref('is_active'), '=', true)
        .unique()
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('catalog').execute();
}
