import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('country')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('iso', 'varchar(3)', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('city')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('country_id', 'integer', (col) => col.notNull().references('country.id').onDelete('cascade'))
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('street')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('postal_code')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('code', 'varchar(10)', (col) => col.notNull())
        .addColumn('city_id', 'integer', (col) => col.notNull().references('city.id').onDelete('cascade'))
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('address')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('street_id', 'integer', (col) => col.notNull().references('street.id').onDelete('cascade'))
        .addColumn('address_detail', 'varchar(255)', (col) => col.notNull())
        .addColumn('postal_code_id', 'integer', (col) => col.notNull().references('postal_code.id').onDelete('cascade'))
        .addColumn('latitude', 'decimal', (col) => col.notNull())
        .addColumn('longitude', 'decimal', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('country').execute();
    await db.schema.dropTable('city').execute();
    await db.schema.dropTable('street').execute();
    await db.schema.dropTable('postal_code').execute();
    await db.schema.dropTable('address').execute();
}
