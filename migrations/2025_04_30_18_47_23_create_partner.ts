import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('partner')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('phone_number', 'varchar(20)', (col) => col.notNull())
        .addColumn('address_id', 'integer', (col) => col.notNull().references('address.id').onDelete('cascade'))
        .addColumn('image_url', 'varchar(255)', (col) => col.notNull())
        .addColumn('status', 'varchar(50)', (col) => col.notNull().defaultTo('pending').check(sql`status IN ('pending', 'reviewing', 'approved', 'rejected', 'suspended', 'activated')`))
        .addColumn('delivery_method_id', 'integer', (col) => col.notNull().references('delivery_method.id').onDelete('cascade'))
        .addColumn('business_type_id', 'integer', (col) => col.notNull().references('business_type.id').onDelete('cascade'))
        .addColumn('user_id', 'uuid', (col) => col.notNull().references('user.id').onDelete('cascade'))
        .addColumn('delivery_fee', 'decimal', (col) => col.notNull().defaultTo('0.00'))
        .addColumn('min_order_value', 'decimal', (col) => col.notNull().defaultTo('0.00'))
        .addColumn('max_delivery_distance_km', 'decimal', (col) => col.notNull().defaultTo('10.00'))
        .addColumn('activation_token', 'varchar(255)')
        .addColumn('rejection_reason', 'text')
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('partner_hour')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('partner_id', 'integer', (col) => col.notNull().references('partner.id').onDelete('cascade'))
        .addColumn('day_of_week', 'integer', (col) => col.notNull().check(sql`day_of_week BETWEEN 0 AND 6`))
        .addColumn('opens_at', 'time', (col) => col.notNull())
        .addColumn('closes_at', 'time', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addUniqueConstraint('unique_partner_day', ['partner_id', 'day_of_week'])
        .execute();

    await db.schema.createTable('catalog')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('partner_id', 'integer', (col) => col.notNull().references('partner.id').onDelete('cascade'))
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('description', 'text')
        .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createIndex('one_active_catalog_per_partner')
        .on('catalog')
        .column('partner_id')
        .where(sql.ref('is_active'), '=', true)
        .unique()
        .execute();

    await db.schema.createTable('catalog_category')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('catalog_id', 'integer', (col) => col.notNull().references('catalog.id').onDelete('cascade'))
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('is_published', 'boolean', (col) => col.notNull().defaultTo(false))
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    await db.schema.createTable('catalog_item')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('catalog_category_id', 'integer', (col) => col.notNull().references('catalog_category.id').onDelete('cascade'))
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('description', 'text', (col) => col.notNull())
        .addColumn('price', 'decimal', (col) => col.notNull())
        .addColumn('image_url', 'varchar(255)')
        .addColumn('is_available', 'boolean', (col) => col.notNull().defaultTo(true))
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('partner').execute();
    await db.schema.dropTable('partner_hour').execute();
    await db.schema.dropTable('catalog').execute();
    await db.schema.dropTable('catalog_category').execute();
    await db.schema.dropTable('catalog_item').execute();
}
