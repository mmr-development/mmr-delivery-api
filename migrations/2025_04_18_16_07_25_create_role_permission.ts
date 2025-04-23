import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('role_permission')
        .addColumn('role_id', 'uuid', (col) =>
            col.notNull().references('role.id').onDelete('cascade'))
        .addColumn('permission_id', 'uuid', (col) =>
            col.notNull().references('permission.id').onDelete('cascade'))
        .addColumn('created_at', 'timestamp', (col) =>
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .addColumn('updated_at', 'timestamp', (col) =>
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .addPrimaryKeyConstraint('pk_role_permission', ['role_id', 'permission_id'])
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('role_permission').execute();
}
