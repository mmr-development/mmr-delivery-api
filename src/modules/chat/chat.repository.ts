import { Kysely } from 'kysely';
import { Database } from '../../database';
import {
  ChatRow, InsertableChatRow,
  UserChatRow, InsertableUserChatRow,
  MessageRow, InsertableMessageRow,
  PushTokenRow, InsertablePushTokenRow
} from './chat.table';

export interface ChatRepository {
  createChat(): Promise<ChatRow>;
  addUserToChat(userChat: InsertableUserChatRow): Promise<UserChatRow>;
  getUserChats(user_id: string): Promise<ChatRow[]>;
  getChatMessages(chat_id: number): Promise<MessageRow[]>;
  createMessage(message: InsertableMessageRow): Promise<MessageRow>;
  // savePushToken(token: InsertablePushTokenRow): Promise<void>;
  getPushTokensForUser(user_id: string): Promise<PushTokenRow[]>;
}

export function createChatRepository(db: Kysely<Database>): ChatRepository {
  return {
    async createChat() {
      return await db.insertInto('chat').values({}).returningAll().executeTakeFirstOrThrow();
    },
    async addUserToChat(userChat) {
      return await db.insertInto('user_chat').values(userChat).returningAll().executeTakeFirstOrThrow();
    },
    async getUserChats(user_id) {
      return await db.selectFrom('chat')
        .innerJoin('user_chat', 'chat.id', 'user_chat.chat_id')
        .where('user_chat.user_id', '=', user_id)
        .selectAll('chat')
        .execute();
    },
    async getChatMessages(chat_id) {
      return await db.selectFrom('message')
        .where('chat_id', '=', chat_id)
        .selectAll()
        .orderBy('created_at', 'asc')
        .execute();
    },
    async createMessage(message) {
      return await db.insertInto('message').values(message).returningAll().executeTakeFirstOrThrow();
    },
    // async savePushToken(token) {
    //   await db.insertInto('push_token').values(token).onConflictDoNothing().execute();
    // },
    async getPushTokensForUser(user_id) {
      return await db.selectFrom('push_token').where('user_id', '=', user_id).selectAll().execute();
    }
  };
}
