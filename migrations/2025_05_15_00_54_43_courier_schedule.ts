import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('courier_schedule')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('courier_id', 'integer', (col) => col.notNull().references('employee.id').onDelete('cascade'))
        .addColumn('start_datetime', 'timestamp', (col) => col.notNull())
        .addColumn('end_datetime', 'timestamp', (col) => col.notNull())
        .addColumn('status', 'varchar(50)', (col) => col.notNull().defaultTo('scheduled')
            .check(sql`status IN ('scheduled', 'confirmed', 'completed', 'canceled')`))
        .addColumn('notes', 'text')
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('time_entry')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('courier_id', 'integer', (col) => col.notNull().references('employee.id').onDelete('cascade'))
        .addColumn('schedule_id', 'integer', (col) => col.references('courier_schedule.id').onDelete('set null'))
        .addColumn('clock_in', 'timestamp', (col) => col.notNull())
        .addColumn('clock_out', 'timestamp')
        .addColumn('notes', 'text')
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('time_entry').execute();
    await db.schema.dropTable('courier_schedule').execute();
}