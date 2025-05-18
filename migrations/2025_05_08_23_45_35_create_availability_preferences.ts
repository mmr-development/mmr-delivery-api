import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('hour_preference')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('name', 'varchar(100)', (col) => col.notNull())
        .addColumn('description', 'varchar(255)')
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.insertInto('hour_preference')
        .values([
            { name: 'Less than 8 hours per week' },
            { name: '8-15 hours per week' },
            { name: '16-23 hours per week' },
            { name: '24+ hours per week' }
        ])
        .execute();

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
    await db.schema.dropTable('hour_preference').execute();
    await db.schema.dropTable('schedule_preference').execute();
}
