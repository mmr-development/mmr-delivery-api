import { FastifyPluginAsync } from 'fastify';
import { ChatService } from './chat.service';
import { ControllerError } from '../../utils/errors';
import { createChatSchema } from './chat.schema';

export interface ChatControllerOptions {
    chatService: ChatService;
}

export const chatController: FastifyPluginAsync<ChatControllerOptions> = async function(server, { chatService }) {
    server.post('/chats/', { 
        schema: { ...createChatSchema, tags: ['Chat'] },
        preHandler: [server.authenticate]
      }, async (request, reply) => {
        try {
          const currentUserId = request.user.sub;
          const { participant_ids = [] } = request.body as { participant_ids: string[] };

          const uniqueParticipants = [...new Set([currentUserId, ...participant_ids])];
          
          const chat = await chatService.createChatForUsers(uniqueParticipants);
          return reply.code(201).send(chat);
        } catch (error) {
          console.error('Error creating chat:', error);
          return reply.code(500).send({ message: 'Internal server error' });
        }
      });

    //   server.get('/chats/', { 
    //     schema: { tags: ['Chat'] }, 
    //     preHandler: [server.authenticate] 
    //   }, async (request, reply) => {
    //     try {
    //       const userId = request.user.sub;
    //       const chats = await chatService.getUserChats(userId);
    //       return reply.code(200).send({ chats });
    //     } catch (error) {
    //       console.error('Error fetching chats:', error);
    //       return reply.code(500).send({ message: 'Internal server error' });
    //     }
    //   });
    
}

// // src/modules/chat/chat.controller.ts
// import { FastifyPluginAsync } from 'fastify';
// import { ChatService } from './chat.service';

// export const chatController: (chatService: ChatService) => FastifyPluginAsync = 
//   (chatService) => async (fastify) => {
    
//     // Create a new chat with initial participants
//     fastify.post('/chats', {
//       schema: {
//         tags: ['Chat'],
//         body: {
//           type: 'object',
//           properties: {
//             participant_ids: { type: 'array', items: { type: 'string' } }
//           }
//         }
//       },
//       preHandler: [fastify.authenticate]
//     }, async (request, reply) => {
//       const currentUserId = request.user.sub;
//       const participants = [...new Set([currentUserId, ...(request.body.participant_ids || [])])];
      
//       const chat = await chatService.createChatForUsers(participants);
//       return reply.code(201).send(chat);
//     });
    
//     // Add a user to an existing chat
//     fastify.post('/chats/:id/participants', {
//       schema: {
//         tags: ['Chat'],
//         params: {
//           type: 'object',
//           properties: {
//             id: { type: 'number' }
//           }
//         },
//         body: {
//           type: 'object',
//           properties: {
//             user_id: { type: 'string' }
//           },
//           required: ['user_id']
//         }
//       },
//       preHandler: [fastify.authenticate]
//     }, async (request, reply) => {
//       await chatService.addUserToChat(parseInt(request.params.id), request.body.user_id);
//       return reply.code(200).send({ success: true });
//     });
    
//     // Get user's chats
//     fastify.get('/chats', {
//       schema: { tags: ['Chat'] },
//       preHandler: [fastify.authenticate]
//     }, async (request, reply) => {
//       const userId = request.user.sub;
//       const chats = await chatService.getUserChats(userId);
//       return reply.send(chats);
//     });
//   };