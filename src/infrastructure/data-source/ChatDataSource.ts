import type { Conversation, Message, MessageType } from '@/types'

export type SendMessagePayload = {
  content?: string
  type?: MessageType
  attachmentUrl?: string | null
  attachmentName?: string | null
  replyToId?: string | null
}

export type ChatAttachment = { url: string; name: string; type: MessageType }

export type ConversationMedia = {
  media: { id: string; type: string; url: string; name: string | null; time: string }[]
  docs: { id: string; type: string; url: string; name: string | null; time: string }[]
  links: { id: string; url: string; text: string; time: string }[]
}

export interface ChatDataSource {
  listConversations(): Promise<Conversation[]>
  getConversation(id: string): Promise<Conversation>
  createConversation(data: { storeId?: string; orderId?: string; subject?: string }): Promise<Conversation>
  sendMessage(conversationId: string, payload: SendMessagePayload): Promise<Message>
  uploadAttachment(conversationId: string, localUri: string): Promise<ChatAttachment>
  deleteMessage(conversationId: string, messageId: string): Promise<void>
  markAsRead(conversationId: string): Promise<void>
  closeConversation(id: string): Promise<void>
  archiveConversation(id: string): Promise<void>
  getConversationMedia(id: string): Promise<ConversationMedia>
}
