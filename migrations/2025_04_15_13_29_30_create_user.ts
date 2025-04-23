import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('user')
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('first_name', 'varchar(255)', (col) => col.notNull())
        .addColumn('last_name', 'varchar(255)', (col) => col.notNull())
        .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`NOW()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`NOW()`))
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('user').execute()
}
