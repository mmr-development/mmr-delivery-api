import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('employee')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('user_id', 'uuid', (col) => col.notNull().references('user.id').onDelete('cascade'))
        .addColumn('vehicle_type_id', 'integer', (col) => col.notNull().references('vehicle_type.id').onDelete('cascade'))
        .addColumn('address_id', 'integer', (col) => col.notNull().references('address.id').onDelete('cascade'))
        .addColumn('schedule_preference_id', 'integer', (col) => col.references('schedule_preference.id'))
        .addColumn('hours_preference_id', 'integer', (col) => col.references('hour_preference.id'))
        .addColumn('data_retention_consent', 'boolean', (col) => col.defaultTo(false))
        .addColumn('is_eighteen_plus', 'boolean', (col) => col.defaultTo(false))
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('employee_documentation')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('employee_id', 'integer', (col) =>
            col.notNull().references('employee.id').onDelete('cascade'))
        .addColumn('document_type', 'varchar(50)', (col) =>
            col.notNull())
        .addColumn('document_number', 'varchar(100)', (col) => col.notNull())
        .addColumn('issue_date', 'date')
        .addColumn('expiry_date', 'date')
        .addColumn('verification_status', 'varchar(20)', (col) =>
            col.notNull().defaultTo('pending'))
        .addColumn('verified_by', 'uuid', (col) =>
            col.references('user.id'))
        .addColumn('verification_date', 'timestamp')
        .addColumn('document_url', 'varchar(255)')
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    // Create index for efficient lookups
    await db.schema.createIndex('idx_employee_documentation_employee_id')
        .on('employee_documentation')
        .column('employee_id')
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('employee').execute();
    await db.schema.dropIndex('idx_employee_documentation_employee_id').execute();
    await db.schema.dropTable('employee_documentation').execute();
}
