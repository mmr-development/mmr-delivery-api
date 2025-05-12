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
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('role').execute();
}
