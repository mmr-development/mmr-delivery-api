import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('password_reset_token')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('email', 'varchar(255)', (col) => col.notNull())
        .addColumn('token', 'varchar(255)', (col) => col.notNull())
        .addColumn('is_used', 'boolean', (col) => col.notNull().defaultTo(false))
        .addColumn('expires_at', 'timestamp', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('password_reset_token').execute();
}
