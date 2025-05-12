import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('postal_code')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('code', 'varchar(10)', (col) => col.notNull())
        .addColumn('city_id', 'integer', (col) => col.notNull().references('city.id').onDelete('cascade'))
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('postal_code').execute();
}
