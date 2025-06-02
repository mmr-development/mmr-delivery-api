import { ChatRepository, ChatType } from './chat.repository';
import { InsertableMessageRow, InsertableUserChatRow, InsertablePushTokenRow, MessageRow, ChatRow, MessageContent } from './chat.table';
import { UserRoleService } from '../users/user-role/user-role.service';

export interface ChatService {
  createChatWithParticipants(participants: Array<{ user_id: string, user_role: string }>, type?: ChatType): Promise<ChatRow>;
  isUserInChat: (chat_id: number, user_id: string) => Promise<boolean>;
  createSupportChat: (user_id: string, type?: ChatType) => Promise<ChatRow>;
  addParticipantToChat(chat_id: number, user_id: string, user_role: string): Promise<{ user_id: string; user_role: string; joined_at: string; }>;
  sendMessage(chat_id: number, sender_id: string, content: MessageContent): Promise<MessageRow>;
  getAvailableCouriersForChat(chat_id: number): Promise<Array<{ user_id: string, first_name: string, last_name: string, role: string }>>;
  getSupportChats(user_id: string): Promise<ChatRow[]>;
  getMessages(chat_id: number): Promise<MessageRow[]>;
  getUserChats(user_id: string): Promise<ChatRow[]>
  // savePushToken(user_id: string, token: string): Promise<void>;
}

export function createChatService(repository: ChatRepository, userRoleService: UserRoleService): ChatService {
  return {
    async createChatWithParticipants(participants, type = 'general') {
      for (const participant of participants) {
        const isCreator = participant.user_id === participants[0].user_id;

        if (!isCreator) {
          const hasRequestedRole = await userRoleService.hasRole(
            participant.user_id,
            participant.user_role
          );

          if (!hasRequestedRole) {
            throw new Error(`User ${participant.user_id} doesn't have the role ${participant.user_role}`);
          }
        }
      }

      const chat = await repository.createChat({ type });
      const participantInfo = [];

      for (const participant of participants) {
        await repository.addUserToChat({
          chat_id: chat.id,
          user_id: participant.user_id,
          user_role: participant.user_role
        });

        participantInfo.push({
          user_id: participant.user_id,
          user_role: participant.user_role,
          joined_at: new Date().toISOString()
        });
      }

      return {
        ...chat,
        participants: participantInfo
      };
    },
    async createSupportChat(user_id: string, type: ChatType = 'support') {
      // Find support user with the fewest active chats
      const supportUsers = await repository.getSupportUsersWithChatCount();

      if (!supportUsers.length) {
        throw new Error('No support users available');
      }

      // Select the support user with the fewest active chats
      const supportUser = supportUsers[0];

      // Create participants array with courier and support user
      const participants = [
        { user_id, user_role: 'courier' },
        { user_id: supportUser.user_id, user_role: 'support' }
      ];

      // Create a chat with specified type (default 'support')
      const chat = await this.createChatWithParticipants(
        participants,
        type
      );

      return chat;
    },
    async addParticipantToChat(chat_id: number, user_id: string, user_role: string) {
      const hasRequestedRole = await userRoleService.hasRole(
        user_id,
        user_role
      );

      if (!hasRequestedRole) {
        throw new Error(`User ${user_id} doesn't have the role ${user_role}`);
      }

      await repository.addUserToChat({
        chat_id,
        user_id,
        user_role
      });

      return {
        user_id,
        user_role,
        joined_at: new Date().toISOString()
      };
    },
    async getAvailableCouriersForChat(chat_id) {
      return await repository.getAvailableCouriersForChat(chat_id);
    },
    async getSupportChats(user_id: string) {
      return await repository.getSupportChats(user_id);
    },
    async sendMessage(chat_id, sender_id, content) {
      if (
        typeof content !== 'object' ||
        content === null ||
        (!content.text && !content.images && !content.video)
      ) {
        throw new Error('Invalid message content');
      }
      return await repository.createMessage({ chat_id, sender_id, content });
    },
    async getMessages(chat_id) {
      return await repository.getChatMessages(chat_id);
    },
    async getUserChats(user_id): Promise<ChatRow[]> {
      return await repository.getUserChats(user_id);
    },
    async isUserInChat(chat_id, user_id) {
      return await repository.isUserInChat(chat_id, user_id);
    },
    // async savePushToken(user_id, token) {
    //   await repository.savePushToken({ user_id, token });
    // }
  };
}
