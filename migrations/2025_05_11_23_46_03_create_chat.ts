import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
    .createType('chat_type')
    .asEnum(['support', 'delivery', 'order', 'general'])
    .execute();

  await db.schema.createTable('chat')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('name', 'varchar(255)', col => col.notNull().defaultTo('New Chat'))
    .addColumn('is_active', 'boolean', col => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createTable('user_chat')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('chat_id', 'integer', col => col.notNull().references('chat.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
    .addColumn('user_role', 'varchar(255)', col => col.notNull().defaultTo('participant'))
    .addColumn('joined_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('unique_user_chat', ['chat_id', 'user_id'])
    .execute();

  await db.schema.createTable('message')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('chat_id', 'integer', col => col.notNull().references('chat.id').onDelete('cascade'))
    .addColumn('sender_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
    .addColumn('content', 'jsonb', col => col.notNull())
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createType('push_token_app_type')
    .asEnum(['customer', 'courier'])
    .execute();

  await db.schema.createTable('push_token')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('user_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
    .addColumn('app_type', 'varchar(255)', col => col.notNull())
    .addColumn('token', 'varchar(255)', col => col.notNull())
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('unique_user_push_token', ['user_id', 'token'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('push_token').execute();
  await db.schema.dropType('push_token_app_type').execute();
  await db.schema.dropTable('message').execute();
  await db.schema.dropTable('user_chat').execute();
  await db.schema.dropTable('chat').execute();
  await db.schema.dropType('chat_type').execute();
}