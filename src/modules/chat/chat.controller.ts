import { FastifyPluginAsync } from 'fastify';
import { ChatService } from './chat.service';
import { ControllerError } from '../../utils/errors';
import { createChatSchema } from './chat.schema';

export interface ChatControllerOptions {
    chatService: ChatService;
}

export const chatController: FastifyPluginAsync<ChatControllerOptions> = async function(server, { chatService }) {
    server.post('/chats/', { 
        schema: { ...createChatSchema, tags: ['Chats'] },
        preHandler: [server.authenticate]
      }, async (request, reply) => {
        try {
          const currentUserId = request.user.sub;
          const chat = await chatService.createChatForUsers([currentUserId]);
          return reply.code(201).send(chat);
        } catch (error) {
          console.error('Error creating chat:', error);
          return reply.code(500).send({ message: 'Internal server error' });
        }
      });

      server.get('/chats/', { 
        schema: { tags: ['Chats'] }, 
        preHandler: [server.authenticate] 
      }, async (request, reply) => {
        try {
          const userId = request.user.sub;
          const chats = await chatService.getUserChats(userId);
          return reply.code(200).send({ chats });
        } catch (error) {
          console.error('Error fetching chats:', error);
          return reply.code(500).send({ message: 'Internal server error' });
        }
      });
    
}