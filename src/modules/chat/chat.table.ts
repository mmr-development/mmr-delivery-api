import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface ChatTable {
  id: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
export interface UserChatTable {
  id: Generated<number>;
  chat_id: number;
  user_id: string;
  joined_at: Generated<Date>;
}

export interface ImageContent {
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface MessageContent {
  text?: string;
  images?: ImageContent[];
  video?: string;
}

export interface MessageTable {
  id: Generated<number>;
  chat_id: number;
  sender_id: string;
  content: MessageContent;
  created_at: Generated<Date>;
}
export interface PushTokenTable {
  id: Generated<number>;
  user_id: string;
  token: string;
  created_at: Generated<Date>;
}

export type ChatRow = Selectable<ChatTable>;
export type InsertableChatRow = Insertable<ChatTable>;
export type UserChatRow = Selectable<UserChatTable>;
export type InsertableUserChatRow = Insertable<UserChatTable>;
export type MessageRow = Selectable<MessageTable>;
export type InsertableMessageRow = Insertable<MessageTable>;
export type PushTokenRow = Selectable<PushTokenTable>;
export type InsertablePushTokenRow = Insertable<PushTokenTable>;