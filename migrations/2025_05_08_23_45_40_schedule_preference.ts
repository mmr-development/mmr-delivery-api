import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('schedule_preference')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('name', 'varchar(100)', (col) => col.notNull())
        .addColumn('description', 'varchar(255)')
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.insertInto('schedule_preference')
        .values([
            { name: 'Mixed Weekdays & Weekend' },
            { name: 'Evening Weekdays & Weekend' },
            { name: 'Only Weekend' }
        ])
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('schedule_preference').execute();
}
