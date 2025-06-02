import { Kysely, sql } from 'kysely';
import { Database } from '../../database';
import {
  ChatRow, InsertableChatRow,
  UserChatRow, InsertableUserChatRow,
  MessageRow, InsertableMessageRow,
  PushTokenRow, InsertablePushTokenRow
} from './chat.table';

export interface ChatRepository {
  createChat(options?: { type?: ChatType, name?: string }): Promise<ChatRow>;
  addUserToChat(userChat: InsertableUserChatRow): Promise<UserChatRow>;
  getUserChats(user_id: string): Promise<ChatRow[]>;
  getChatMessages(chat_id: number): Promise<MessageRow[]>;
  getSupportUsersWithChatCount(): Promise<Array<{ user_id: string, first_name: string, last_name: string, chat_count: number }>>;
  createMessage(message: InsertableMessageRow): Promise<MessageRow>;
  getSupportChats(user_id: string): Promise<ChatRow[]>;
  isUserInChat(chat_id: number, user_id: string): Promise<boolean>;
  getAvailableCouriersForChat(chat_id: number): Promise<Array<{ user_id: string, first_name: string, last_name: string, role: string }>>;
  // savePushToken(token: InsertablePushTokenRow): Promise<void>;
  getPushTokensForUser(user_id: string): Promise<PushTokenRow[]>;
}

export type ChatType = 'general' | 'order' | 'delivery' | 'support';

export function createChatRepository(db: Kysely<Database>): ChatRepository {
  return {
    async createChat({ type = 'general' as ChatType, name = 'New Chat' } = {}): Promise<ChatRow> {
      return await db
        .insertInto('chat')
        .values({
          type,
          name,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    },
    async addUserToChat(userChat) {
      return await db.insertInto('user_chat').values(userChat).returningAll().executeTakeFirstOrThrow();
    },
    async getSupportChats(user_id: string) {
      // First, get the latest message ID for each chat using a subquery
      const latestMessageSubquery = db
        .selectFrom('message')
        .select(['chat_id', db.fn.max('created_at').as('latest_created_at')])
        .groupBy('chat_id')
        .as('latest_message');

      // Now join everything together
      return await db
        .selectFrom('chat')
        .innerJoin('user_chat', 'chat.id', 'user_chat.chat_id')
        .leftJoin(latestMessageSubquery, 'chat.id', 'latest_message.chat_id')
        .leftJoin('message', join =>
          join.onRef('message.chat_id', '=', 'chat.id')
            .onRef('message.created_at', '=', 'latest_message.latest_created_at')
        )
        .leftJoin('user', 'message.sender_id', 'user.id')
        .where('user_chat.user_id', '=', user_id)
        .where('chat.type', '=', 'support')
        .select([
          'chat.id',
          'chat.type',
          'chat.name',
          'chat.created_at',
          'chat.updated_at',
          'message.id as last_message_id',
          'message.content as last_message_content',
          'message.created_at as last_message_created_at',
          'user.first_name as last_message_sender_first_name',
          'user.last_name as last_message_sender_last_name'
        ])
        .execute()
        .then(rows => {
          // Same transformation as in getUserChats
          return rows.map(row => ({
            id: row.id,
            type: row.type,
            name: row.name,
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_message: row.last_message_id ? {
              id: row.last_message_id,
              content: row.last_message_content,
              created_at: row.last_message_created_at,
              sender_name: `${row.last_message_sender_first_name || ''} ${row.last_message_sender_last_name || ''}`.trim()
            } : null
          }));
        });
    },
    async getUserChats(user_id) {
      // First, get the latest message ID for each chat using a subquery
      const latestMessageSubquery = db
        .selectFrom('message')
        .select(['chat_id', db.fn.max('created_at').as('latest_created_at')])
        .groupBy('chat_id')
        .as('latest_message');

      // Now join everything together
      return await db
        .selectFrom('chat')
        .innerJoin('user_chat', 'chat.id', 'user_chat.chat_id')
        .leftJoin(latestMessageSubquery, 'chat.id', 'latest_message.chat_id')
        .leftJoin('message', join =>
          join.onRef('message.chat_id', '=', 'chat.id')
            .onRef('message.created_at', '=', 'latest_message.latest_created_at')
        )
        .leftJoin('user', 'message.sender_id', 'user.id')
        .where('user_chat.user_id', '=', user_id)
        .select([
          'chat.id',
          'chat.type',
          'chat.name',
          'chat.created_at',
          'chat.updated_at',
          'message.id as last_message_id',
          'message.content as last_message_content',
          'message.created_at as last_message_created_at',
          'user.first_name as last_message_sender_first_name',
          'user.last_name as last_message_sender_last_name'
        ])
        .execute()
        .then(rows => {
          return rows.map(row => ({
            id: row.id,
            type: row.type,
            name: row.name,
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_message: row.last_message_id ? {
              id: row.last_message_id,
              content: row.last_message_content,
              created_at: row.last_message_created_at,
              sender_name: `${row.last_message_sender_first_name || ''} ${row.last_message_sender_last_name || ''}`.trim()
            } : null
          }));
        });
    },
    async getChatMessages(chat_id) {
      return await db.selectFrom('message')
        .innerJoin('user', 'message.sender_id', 'user.id')
        .where('message.chat_id', '=', chat_id)
        .select([
          'message.id',
          'message.chat_id',
          'message.sender_id',
          'message.content',
          'message.created_at',
          'user.first_name',
          'user.last_name'
        ])
        .orderBy('message.created_at', 'asc')
        .execute();
    },
    async getSupportUsersWithChatCount(): Promise<Array<{ user_id: string, first_name: string, last_name: string, chat_count: number }>> {
      return await db
        .selectFrom('user')
        .innerJoin('user_role', 'user.id', 'user_role.user_id')
        .innerJoin('role', 'user_role.role_id', 'role.id')
        .leftJoin(subquery => {
          return subquery
            .selectFrom('user_chat')
            .innerJoin('chat', 'user_chat.chat_id', 'chat.id')
            .where('chat.type', '=', 'support')
            .select(['user_chat.user_id', db.fn.count('user_chat.chat_id').as('chat_count')])
            .groupBy('user_chat.user_id')
            .as('support_chats');
        }, 'user.id', 'support_chats.user_id')
        .where('role.name', '=', 'support')
        .select([
          'user.id as user_id',
          'user.first_name',
          'user.last_name',
          db.fn.coalesce('support_chats.chat_count', sql`0`).as('chat_count')
        ])
        .orderBy('chat_count', 'asc')
        .execute();
    },
    async getAvailableCouriersForChat(chat_id) {
      // Get all users with courier role who are NOT in this chat
      return await db
        .selectFrom('user')
        .innerJoin('user_role', 'user.id', 'user_role.user_id')
        .innerJoin('role', 'user_role.role_id', 'role.id')
        .where('role.name', '=', 'courier')
        .where(eb =>
          // Use not() with exists() instead of notExists
          eb.not(
            eb.exists(
              eb.selectFrom('user_chat')
                .whereRef('user_chat.user_id', '=', 'user.id')
                .where('user_chat.chat_id', '=', chat_id)
                .select('user_chat.id')
            )
          )
        )
        .select([
          'user.id as user_id',
          'user.first_name',
          'user.last_name',
          'role.name as role'
        ])
        .execute();
    },
    async createMessage(message) {
      const insertedMessage = await db.insertInto('message')
        .values(message)
        .returningAll()
        .executeTakeFirstOrThrow();

      return await db.selectFrom('message')
        .innerJoin('user', 'message.sender_id', 'user.id')
        .where('message.id', '=', insertedMessage.id)
        .select([
          'message.id',
          'message.chat_id',
          'message.sender_id',
          'message.content',
          'message.created_at',
          'user.first_name',
          'user.last_name'
        ])
        .executeTakeFirstOrThrow();
    },
    async isUserInChat(chat_id, user_id) {
      const result = await db.selectFrom('user_chat')
        .where('chat_id', '=', chat_id)
        .where('user_id', '=', user_id)
        .select('id')
        .executeTakeFirst();
      return !!result;
    },
    // async savePushToken(token) {
    //   await db.insertInto('push_token').values(token).onConflictDoNothing().execute();
    // },
    async getPushTokensForUser(user_id) {
      return await db.selectFrom('push_token').where('user_id', '=', user_id).selectAll().execute();
    }
  };
}
