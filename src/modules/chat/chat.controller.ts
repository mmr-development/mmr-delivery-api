import { FastifyPluginAsync } from 'fastify';
import { ChatService } from './chat.service';
import { createChatSchema } from './chat.schema';

export interface ChatControllerOptions {
    chatService: ChatService;
}

export const chatController: FastifyPluginAsync<ChatControllerOptions> = async function(server, { chatService }) {
    server.post('/chats/', { schema: { ...createChatSchema, tags: ['Chats'] }, preHandler: [server.authenticate]}, async (request, reply) => {
      const currentUserId = request.user.sub;  
      try {
          const chat = await chatService.createChatForUsers([currentUserId]);
          return reply.code(201).send(chat);
        } catch (error) {
          return reply.code(500).send({ message: 'Internal server error' });
        }
      });

      server.get('/chats/', { schema: { tags: ['Chats'] }, preHandler: [server.authenticate]}, async (request, reply) => {
        const userId = request.user.sub;
        try {
          const chats = await chatService.getUserChats(userId);
          return reply.code(200).send(chats);
        } catch (error) {
          return reply.code(500).send({ message: 'Internal server error' });
        }
      });
}
