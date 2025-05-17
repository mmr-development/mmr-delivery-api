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

const connections = new Map<number, Set<{ socket: WebSocket, userId: string }>>();

function addConnection(chatId: number, socket: WebSocket, userId: string) {
  if (!connections.has(chatId)) connections.set(chatId, new Set());
  connections.get(chatId)!.add({ socket, userId });
}

function removeConnection(chatId: number, socket: WebSocket) {
  if (connections.has(chatId)) {
    const clients = connections.get(chatId)!;
    for (const client of clients) {
      if (client.socket === socket) {
        clients.delete(client);
        break;
      }
    }
    if (clients.size === 0) connections.delete(chatId);
  }
}

function broadcast(chatId: number, message: OutgoingMessage) {
  connections.get(chatId)?.forEach(client => {
    if (client.socket.readyState === WebSocket.OPEN) {
      // Add isSender flag if the message contains a userId
      if (message.type === 'message' && message.message?.user_id) {
        const customMessage = {
          ...message,
          isSender: message.message.user_id === client.userId
        };
        client.socket.send(JSON.stringify(customMessage));
      } else {
        client.socket.send(JSON.stringify(message));
      }
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
  fastify.get<{ Params: { chat_id: number } }>('/ws/chat/:chat_id', { websocket: true, preHandler: [fastify.authenticate] }, (connection, req) => {
    const socket = connection;
    const chatId = Number(req.params.chat_id);
    const userId = req.user.sub;

    addConnection(chatId, socket, userId);

    // Send chat history
    service.getMessages(chatId)
      .then(history => {
        const historyWithSenderFlag = {
          type: 'history',
          messages: history.map(msg => ({
            ...msg,
            isSender: msg.sender_id === userId
          }))
        };
        socket.send(JSON.stringify(historyWithSenderFlag));
      })
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
}