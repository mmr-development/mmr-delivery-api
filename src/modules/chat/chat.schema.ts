import { Static, Type } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

// Base schemas
export const ChatBaseSchema = Type.Object({
  id: Type.Number(),
  type: Type.Union([
    Type.Literal('support'),
    Type.Literal('courier'),
    Type.Literal('general')
  ], { default: 'general' }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
});


export const ChatParticipantBaseSchema = Type.Object({
  user_id: Type.String(),
  user_role: Type.String({ default: 'participant' }),
  joined_at: Type.String({ format: 'date-time' }),
});

export const MessageBaseSchema = Type.Object({
  sender_id: Type.String(),
  type: Type.Union([
    Type.Literal('text'),
    Type.Literal('image')
  ]),
  content: Type.String(),
});

// Create chat schema
export const CreateChatSchema = Type.Object({
  type: Type.Optional(Type.Union([
    Type.Literal('support'),
    Type.Literal('general'),
    Type.Literal('order'),
    Type.Literal('delivery')
  ], { default: 'general' })),
  participants: Type.Array(
    Type.Object({
      user_id: Type.String(),
      user_role: Type.Optional(Type.String({ default: 'participant' }))
    }), 
    {
      description: 'Array of participants to add to the chat (current user will be added automatically)',
      minItems: 1,
    }
  )
});

// Response schemas
export const ChatResponseSchema = Type.Intersect([
  ChatBaseSchema,
  Type.Object({
    participants: Type.Array(ChatParticipantBaseSchema)
  })
]);

export const ChatListResponseSchema = Type.Object({
  chats: Type.Array(ChatResponseSchema)
});

export const MessageResponseSchema = Type.Intersect([
  MessageBaseSchema,
  Type.Object({
    id: Type.Number(),
    chat_id: Type.Number(),
    created_at: Type.String({ format: 'date-time' }),
  })
]);

export const MessageListResponseSchema = Type.Object({
  messages: Type.Array(MessageResponseSchema)
});

export const AddParticipantSchema = Type.Object({
  user_id: Type.String({ description: 'User ID to add to the chat' }),
  user_role: Type.Optional(Type.String({ 
    default: 'participant',
    description: 'Role of the user in this chat' 
  }))
});

// Types
export type CreateChatRequest = Static<typeof CreateChatSchema>;
export type ChatResponse = Static<typeof ChatResponseSchema>;
export type MessageResponse = Static<typeof MessageResponseSchema>;
export type AddParticipantRequest = Static<typeof AddParticipantSchema>;

// Fastify schemas
export const createChatSchema: FastifySchema = {
  summary: 'Create a new chat',
  description: 'Create a new chat with at least one other participant',
  tags: ['Chat'],
  body: CreateChatSchema, // Make body required with required participants
  response: {
    201: ChatResponseSchema
  }
};

export const listChatsSchema: FastifySchema = {
  summary: 'Get all user chats',
  description: 'Get all chats for the current user',
  tags: ['Chat'],
  response: {
    200: ChatListResponseSchema
  }
};

export const getChatByIdSchema: FastifySchema = {
  summary: 'Get chat by ID',
  description: 'Get chat details by ID',
  tags: ['Chat'],
  params: Type.Object({
    chat_id: Type.Number()
  }),
  response: {
    200: ChatResponseSchema
  }
};

export const addChatParticipantSchema: FastifySchema = {
  summary: 'Add participant to chat',
  description: 'Add a new participant to an existing chat',
  tags: ['Chat'],
  params: Type.Object({
    chat_id: Type.Number()
  }),
  body: AddParticipantSchema,
  response: {
    201: ChatParticipantBaseSchema
  }
};

export const removeChatParticipantSchema: FastifySchema = {
  summary: 'Remove participant from chat',
  description: 'Remove a participant from an existing chat',
  tags: ['Chat'],
  params: Type.Object({
    chat_id: Type.Number(),
    user_id: Type.String()
  }),
  response: {
    204: Type.Null()
  }
};

export const getChatMessagesSchema: FastifySchema = {
  summary: 'Get chat messages',
  description: 'Get all messages for a specific chat',
  tags: ['Chat'],
  params: Type.Object({
    chat_id: Type.Number()
  }),
  response: {
    200: MessageListResponseSchema
  }
};