import { ChatRepository } from './chat.repository';
import { InsertableMessageRow, InsertableUserChatRow, InsertablePushTokenRow, MessageRow, ChatRow } from './chat.table';

export interface ChatService {
  createChatForUsers(userIds: string[]): Promise<ChatRow>;
  sendMessage(chat_id: number, sender_id: string, type: 'text' | 'image', content: string): Promise<MessageRow>;
  getMessages(chat_id: number): Promise<MessageRow[]>;
  // savePushToken(user_id: string, token: string): Promise<void>;
}

export function createChatService(repository: ChatRepository): ChatService {
  return {
    async createChatForUsers(userIds) {
      const chat = await repository.createChat();
      for (const user_id of userIds) {
        await repository.addUserToChat({ chat_id: chat.id, user_id });
      }
      return chat;
    },
    async sendMessage(chat_id, sender_id, type, content) {
      return await repository.createMessage({ chat_id, sender_id, type, content });
    },
    async getMessages(chat_id) {
      return await repository.getChatMessages(chat_id);
    },
    // async savePushToken(user_id, token) {
    //   await repository.savePushToken({ user_id, token });
    // }
  };
}
