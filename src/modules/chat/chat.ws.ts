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

function sendMessage(socket: WebSocket, message: OutgoingMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function sendError(socket: WebSocket, errorMessage: string) {
  sendMessage(socket, { type: 'error', error: errorMessage });
}

function addSenderFlag(message: any, userId: string) {
  return {
    ...message,
    isSender: message.sender_id === userId || message.user_id === userId
  };
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
    if (message.type === 'message' && message.message) {
      const customMessage = {
        ...message,
        message: addSenderFlag(message.message, client.userId)
      };
      sendMessage(client.socket, customMessage);
    } else {
      sendMessage(client.socket, message);
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
  fastify.get<{ Params: { chat_id: number } }>('/ws/chat/:chat_id', { websocket: true, preHandler: [fastify.authenticate] }, async (connection, req) => {
    const socket = connection;
    const chatId = Number(req.params.chat_id);
    const userId = req.user.sub;

    try {
      const isParticipant = await service.isUserInChat(chatId, userId);
      if (!isParticipant) {
        sendError(socket, 'Not authorized to access this chat');
        socket.close();
        return;
      }
    } catch (error) {
      fastify.log.error(error);
      sendError(socket, 'Failed to verify chat access');
      socket.close();
      return;
    }

    addConnection(chatId, socket, userId);

    service.getMessages(chatId)
      .then(history => {
        const historyWithSenderFlag = {
          type: 'history',
          messages: history.map(msg => addSenderFlag(msg, userId))
        };
        sendMessage(socket, historyWithSenderFlag);
      })
      .catch(() => sendError(socket, 'Failed to load chat history'));

    socket.on('message', async (raw) => {
      let msg: IncomingMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        sendError(socket, 'Invalid JSON format');
        return;
      }

      if (!msg.action || typeof msg.content === 'undefined') {
        sendError(socket, 'Missing action or content');
        return;
      }

      if (msg.action === 'message') {
        if (!isValidMessageContent(msg.content)) {
          sendError(socket, 'Invalid message content');
          return;
        }

        try {
          const saved = await service.sendMessage(chatId, userId, msg.content);
          broadcast(chatId, { type: 'message', message: saved });
        } catch (err) {
          console.error('Failed to send message:', err);
          sendError(socket, 'Failed to send message');
        }
      } else {
        sendError(socket, 'Unknown action');
      }
    });

    socket.on('close', () => removeConnection(chatId, socket));
  });
}