import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('role')
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('name', 'varchar(255)')
        .addColumn('description', 'text')
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.insertInto('role')
        .values([
            { name: 'admin', description: 'Administrator role' },
            { name: 'customer', description: 'Customer ordering food' },
            { name: 'partner', description: 'Restaurant or partner managing their menu and orders' },
            { name: 'courier', description: 'Delivery driver fulfilling orders' },
            { name: 'support', description: 'Support staff assisting users and partners' },
        ])
        .execute();

    await db.schema.createTable('user_role')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('user_id', 'uuid', (col) => col.references('user.id').onDelete('cascade').notNull())
        .addColumn('role_id', 'uuid', (col) => col.references('role.id').onDelete('cascade').notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addUniqueConstraint('unique_user_role', ['user_id', 'role_id'])
        .execute();

    await db.schema.createTable('permission')
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('slug', 'varchar(255)', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

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
    await db.schema.dropTable('role').execute();
    await db.schema.dropTable('user_role').execute();
    await db.schema.dropTable('permission').execute();
    await db.schema.dropTable('role_permission').execute();
}
