import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('refresh_token')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('user_id', 'uuid', (col) => col.references('user.id').notNull().onDelete('cascade'))
        .addColumn('refresh_token_id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`))
        .addColumn('last_refreshed_at', 'timestamp', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.schema
        .createIndex('refresh_token_user_id_index')
        .on('refresh_token')
        .column('user_id')
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('refresh_token').execute();
}
