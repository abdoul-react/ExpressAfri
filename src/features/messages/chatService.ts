import { chatDataSource } from "@/infrastructure/data-source";
import type {
  SendMessagePayload,
  ChatAttachment,
  ConversationMedia,
} from "@/infrastructure/data-source/ChatDataSource";
import type { Conversation, Message } from "@/types";

export async function getConversations(): Promise<Conversation[]> {
  return chatDataSource.listConversations();
}

export async function getConversation(id: string): Promise<Conversation> {
  return chatDataSource.getConversation(id);
}

export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload,
): Promise<Message> {
  return chatDataSource.sendMessage(conversationId, payload);
}

export async function uploadAttachment(
  conversationId: string,
  localUri: string,
): Promise<ChatAttachment> {
  return chatDataSource.uploadAttachment(conversationId, localUri);
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  return chatDataSource.deleteMessage(conversationId, messageId);
}

export async function archiveConversation(id: string): Promise<void> {
  return chatDataSource.archiveConversation(id);
}

export async function getConversationMedia(id: string): Promise<ConversationMedia> {
  return chatDataSource.getConversationMedia(id);
}

export async function createConversation(data: {
  storeId?: string;
  orderId?: string;
  subject?: string;
}): Promise<Conversation> {
  return chatDataSource.createConversation(data);
}

export async function markAsRead(conversationId: string): Promise<void> {
  return chatDataSource.markAsRead(conversationId);
}

export const chatService = {
  getConversations,
  getConversation,
  sendMessage,
  uploadAttachment,
  deleteMessage,
  archiveConversation,
  getConversationMedia,
  createConversation,
  markAsRead,
};
