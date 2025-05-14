import { FastifyPluginAsync } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { ChatService } from './chat.service';
import { MessageContent } from './chat.table';

interface IncomingMessage {
  action: string;
  content: MessageContent;
}

interface OutgoingMessage {
  type: string;
  [key: string]: any;
}

const connections = new Map<number, Set<WebSocket>>();

function addConnection(chatId: number, socket: WebSocket) {
  if (!connections.has(chatId)) connections.set(chatId, new Set());
  connections.get(chatId)!.add(socket);
}

function removeConnection(chatId: number, socket: WebSocket) {
  if (connections.has(chatId)) {
    connections.get(chatId)!.delete(socket);
    if (connections.get(chatId)!.size === 0) connections.delete(chatId);
  }
}

function broadcast(chatId: number, message: OutgoingMessage) {
  const payload = JSON.stringify(message);
  connections.get(chatId)?.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function isValidMessageContent(content: any): content is MessageContent {
  if (typeof content !== 'object' || content === null) return false;
  if (
    typeof content.text === 'string' && content.text.trim() !== ''
  ) return true;
  if (
    Array.isArray(content.images) &&
    content.images.length > 0 &&
    content.images.every(
      (img: { url: string; caption?: string }) =>
        typeof img.url === 'string' &&
        img.url.length > 0 &&
        (typeof img.caption === 'undefined' || typeof img.caption === 'string')
    )
  ) return true;
  if (typeof content.video === 'string' && content.video.length > 0) return true;
  return false;
}

export const chatWsPlugin: (service: ChatService) => FastifyPluginAsync = (service) => async (fastify) => {
  await fastify.register(fastifyWebsocket);

  fastify.get<{ Params: { chat_id: number }}>('/ws/chat/:chat_id', { websocket: true, preHandler: [fastify.authenticate] }, (connection, req) => {
    const socket = connection;
    const chatId = Number(req.params.chat_id);
    const userId = req.user.sub;

    addConnection(chatId, socket);

    // Send chat history
    service.getMessages(chatId)
      .then(history => socket.send(JSON.stringify({ type: 'history', messages: history })))
      .catch(() => socket.send(JSON.stringify({ type: 'error', error: 'Failed to load chat history' })));

    socket.on('message', async (raw) => {
      let msg: IncomingMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        socket.send(JSON.stringify({ type: 'error', error: 'Invalid JSON format' }));
        return;
      }

      if (!msg.action || typeof msg.content === 'undefined') {
        socket.send(JSON.stringify({ type: 'error', error: 'Missing action or content' }));
        return;
      }

      if (msg.action === 'message') {
        if (!isValidMessageContent(msg.content)) {
          socket.send(JSON.stringify({ type: 'error', error: 'Invalid message content' }));
          return;
        }

        try {
          const saved = await service.sendMessage(chatId, userId, msg.content);
          broadcast(chatId, { type: 'message', message: saved });
        } catch (err) {
          console.error('Failed to send message:', err); // Add this line
          socket.send(JSON.stringify({ type: 'error', error: 'Failed to send message' }));
        }
      } else {
        socket.send(JSON.stringify({ type: 'error', error: 'Unknown action' }));
      }
    });

    socket.on('close', () => removeConnection(chatId, socket));
  });
};