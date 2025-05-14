import { ChatRepository } from './chat.repository';
import { InsertableMessageRow, InsertableUserChatRow, InsertablePushTokenRow, MessageRow, ChatRow, MessageContent } from './chat.table';

export interface ChatService {
  createChatForUsers(userIds: string[]): Promise<ChatRow>;
  sendMessage(chat_id: number, sender_id: string, content: MessageContent): Promise<MessageRow>;
  getMessages(chat_id: number): Promise<MessageRow[]>;
  getUserChats(user_id: string): Promise<ChatRow[]>
  // savePushToken(user_id: string, token: string): Promise<void>;
}

export function createChatService(repository: ChatRepository): ChatService {
  return {
    async createChatForUsers(userIds) {
      const chat = await repository.createChat();
      const participants = [];
      for (const userId of userIds) {
        await repository.addUserToChat({ 
          chat_id: chat.id, 
          user_id: userId 
        });
        participants.push({
          user_id: userId,
          joined_at: new Date().toISOString() // Convert to string for response serialization
        });
      }
      return {
        ...chat,
        participants
      };
    },
    async sendMessage(chat_id, sender_id, content) {
      // Validate content: must be an object and contain at least one supported field
      if (
        typeof content !== 'object' ||
        content === null ||
        (!content.text && !content.images && !content.video)
      ) {
        throw new Error('Invalid message content');
      }
      // Optionally, further validation for each type can be added here

      return await repository.createMessage({ chat_id, sender_id, content });
    },
    async getMessages(chat_id) {
      return await repository.getChatMessages(chat_id);
    },
    async getUserChats(user_id): Promise<ChatRow[]> {
      return await repository.getUserChats(user_id);
    }
    // async savePushToken(user_id, token) {
    //   await repository.savePushToken({ user_id, token });
    // }
  };
}
