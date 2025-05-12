import { FastifyPluginAsync } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws'; 
import { ChatService } from './chat.service';

interface ChatMessage {
  chat_id: number;
  sender_id: string;
  type: 'text' | 'image';
  content: string;
}

const connections = new Map<number, Set<WebSocket>>();

export const chatWsPlugin: (service: ChatService) => FastifyPluginAsync = (service) => async (fastify) => {
  await fastify.register(fastifyWebsocket);

  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    const socket = connection;
    let currentChatId: number | null = null;

    socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ChatMessage & { action?: string };

        if (msg.action === 'join') {
          currentChatId = msg.chat_id;
          if (!connections.has(currentChatId)) connections.set(currentChatId, new Set());
          connections.get(currentChatId)!.add(socket);

          const history = await service.getMessages(currentChatId);
          socket.send(JSON.stringify({ type: 'history', messages: history }));
        }

        if (msg.action === 'message' && currentChatId) {
          const saved = await service.sendMessage(currentChatId, msg.sender_id, msg.type, msg.content);

          const payload = JSON.stringify({ type: 'message', message: saved });
          connections.get(currentChatId)?.forEach(client => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });
        }
      } catch (err) {
        socket.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
      }
    });

    socket.on('close', () => {
      if (currentChatId && connections.has(currentChatId)) {
        connections.get(currentChatId)!.delete(socket);
        if (connections.get(currentChatId)!.size === 0) connections.delete(currentChatId);
      }
    });
  });
};
