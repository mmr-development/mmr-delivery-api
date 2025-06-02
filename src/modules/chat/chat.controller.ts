import { FastifyPluginAsync } from 'fastify';
import { ChatService } from './chat.service';
import { CreateChatRequest, createChatSchema } from './chat.schema';

export interface ChatControllerOptions {
  chatService: ChatService;
}

export const chatController: FastifyPluginAsync<ChatControllerOptions> = async function (server, { chatService }) {
  server.post('/chats/', { schema: { ...createChatSchema, tags: ['Chats'] }, preHandler: [server.authenticate] }, async (request, reply) => {
    const currentUserId = request.user.sub;
    const currentUserRole = request.user.roles?.[0]

    try {
      const { type = 'general', participants } = request.body as CreateChatRequest;

      const participantData = participants.map(p => ({
        user_id: p.user_id,
        user_role: p.user_role || 'participant'
      }));

      const allParticipants = [
        { user_id: currentUserId, user_role: currentUserRole || 'creator' },
        ...participantData
      ];

      const chat = await chatService.createChatWithParticipants(
        allParticipants,
        type
      );

      return reply.code(201).send(chat);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  });

  server.get('/chats/', {
    schema: {
      tags: ['Chats'],
      response: {
        200: {
          type: 'object',
          properties: {
            chats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  type: { type: 'string' },
                  name: { type: 'string' },
                  last_message: {
                    type: ['object', 'null'],
                    properties: {
                      content: {
                        type: 'object',
                        additionalProperties: true
                      },
                      created_at: { type: 'string', format: 'date-time' },
                      sender_name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [server.authenticate, server.guard.role('courier')],
  }, async (request, reply) => {
    const userId = request.user.sub;
    try {
      const chats = await chatService.getUserChats(userId);

      return reply.code(200).send({
        chats: chats
      });

    } catch (error) {
      return reply.code(500).send({ message: 'Internal server error' });
    }
  });

  server.post<{ Params: { chat_id: string }, Body: { participants: Array<{ user_id: string, user_role?: string }> } }>(
    '/chats/:chat_id/participants/',
    {
      schema: {
        tags: ['Chats'],
        params: {
          type: 'object',
          properties: {
            chat_id: { type: 'string' }
          },
          required: ['chat_id']
        },
        body: {
          type: 'object',
          properties: {
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'string' },
                  user_role: { type: 'string', default: 'participant' }
                },
                required: ['user_id']
              },
              minItems: 1
            }
          },
          required: ['participants']
        },
        response: {
          200: {
            description: 'Participants added successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              participants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    user_id: { type: 'string' },
                    user_role: { type: 'string' },
                    joined_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      },
      preHandler: [server.authenticate]
    },
    async (request, reply) => {
      const currentUserId = request.user.sub;
      const chatId = parseInt(request.params.chat_id);

      try {
        const isParticipant = await chatService.isUserInChat(chatId, currentUserId);
        if (!isParticipant) {
          return reply.code(403).send({
            message: 'You must be a participant in this chat to add others'
          });
        }

        const { participants } = request.body;

        const addedParticipants = await Promise.all(
          participants.map(async (participant) => {
            return chatService.addParticipantToChat(
              chatId,
              participant.user_id,
              participant.user_role || 'participant'
            );
          })
        );

        return reply.code(200).send({
          success: true,
          participants: addedParticipants
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal server error' });
      }
    }
  );

  server.get<{ Params: { chat_id: string } }>('/chats/:chat_id/available-couriers/', {
    schema: {
      tags: ['Chats'],
      params: {
        type: 'object',
        properties: {
          chat_id: { type: 'string' }
        },
        required: ['chat_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            couriers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'string' },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  role: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [server.authenticate, server.guard.role('courier', 'admin')]
  }, async (request, reply) => {
    const chatId = parseInt(request.params.chat_id);
    const currentUserId = request.user.sub;

    try {
      const isParticipant = await chatService.isUserInChat(chatId, currentUserId);
      if (!isParticipant) {
        return reply.code(403).send({ message: 'Not authorized to access this chat' });
      }

      const availableCouriers = await chatService.getAvailableCouriersForChat(chatId);

      return reply.code(200).send({
        couriers: availableCouriers
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  });

  server.post('/chats/support/', {
    schema: {
      tags: ['Chats'],
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            type: { type: 'string' },
            name: { type: 'string' },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'string' },
                  user_role: { type: 'string' },
                  joined_at: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [server.authenticate, server.guard.role('courier')]
  }, async (request, reply) => {
    const courierId = request.user.sub;

    try {
      const chat = await chatService.createSupportChat(courierId);

      return reply.code(201).send(chat);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  });

  server.get('/chats/support/', {
    schema: {
      tags: ['Chats'],
      response: {
        200: {
          type: 'object',
          properties: {
            chats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  type: { type: 'string' },
                  name: { type: 'string' },
                  last_message: {
                    type: ['object', 'null'],
                    properties: {
                      content: {
                        type: 'object',
                        additionalProperties: true
                      },
                      created_at: { type: 'string', format: 'date-time' },
                      sender_name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [server.authenticate, server.guard.role('support')]
  }, async (request, reply) => {
    const supportUserId = request.user.sub;

    try {
      const chats = await chatService.getSupportChats(supportUserId);

      return reply.code(200).send({
        chats: chats
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  });

  server.post('/chats/upload-images/', {
    schema: {
      tags: ['Chats'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [server.authenticate]
  }, async (request, reply) => {
    try {
      const files = request.files();
      const userId = request.user.sub;
      const uploadedImages = [];
      const invalidFiles = [];

      if (!files) {
        return reply.code(400).send({ message: 'No files uploaded' });
      }

      for await (const file of files) {
        // Validate image format
        if (!isValidImage(file)) {
          invalidFiles.push(file.filename);
          continue;
        }

        const timestamp = Date.now();
        const extension = file.filename.split('.').pop()?.toLowerCase();
        const filename = `${userId}_${timestamp}_${Math.random().toString(36).substring(2, 15)}.${extension}`;

        const storagePath = await saveFile(file.file, filename, 'chat-images');
        const url = getPublicUrl(storagePath);

        uploadedImages.push({
          url
        });
      }

      if (uploadedImages.length === 0 && invalidFiles.length > 0) {
        return reply.code(400).send({
          message: 'No valid images uploaded',
          invalidFiles,
          allowedFormats: ALLOWED_IMAGE_EXTENSIONS
        });
      }

      return reply.code(200).send({
        images: uploadedImages,
        invalidFiles: invalidFiles.length > 0 ? invalidFiles : undefined
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ message: 'Error uploading images' });
    }
  });
}

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function isValidImage(file: any): boolean {
  // Check file extension
  const extension = file.filename.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return false;
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return false;
  }

  return true;
}

async function saveFile(fileStream: any, filename: string, folder: string): Promise<string> {
  const path = require('path');
  const fs = require('fs');
  const pump = require('pump');

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);

  return new Promise((resolve, reject) => {
    pump(fileStream, fs.createWriteStream(filePath), (err: any) => {
      if (err) reject(err);
      else resolve(`${folder}/${filename}`);
    });
  });
}

function getPublicUrl(storagePath: string): string {
  return `/uploads/${storagePath}`;
}
