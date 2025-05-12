import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('chat')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createTable('user_chat')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('chat_id', 'integer', col => col.notNull().references('chat.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
    .addColumn('joined_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('unique_user_chat', ['chat_id', 'user_id'])
    .execute();

  await db.schema.createTable('message')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('chat_id', 'integer', col => col.notNull().references('chat.id').onDelete('cascade'))
    .addColumn('sender_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
    .addColumn('type', 'varchar(16)', col => col.notNull()) // 'text', 'image'
    .addColumn('content', 'text', col => col.notNull())
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createTable('push_token')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('user_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
    .addColumn('token', 'varchar(255)', col => col.notNull())
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('unique_user_push_token', ['user_id', 'token'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('push_token').execute();
  await db.schema.dropTable('message').execute();
  await db.schema.dropTable('user_chat').execute();
  await db.schema.dropTable('chat').execute();
}