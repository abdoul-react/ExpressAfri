export type MessageStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type MessagePriority = 'low' | 'medium' | 'high'

export interface MessageItem {
  id: string
  conversationId: string
  customerId: string
  customerName: string
  customerEmail: string
  subject: string
  lastMessage: string
  status: MessageStatus
  priority: MessagePriority
  assignedTo?: string
  assignedToName?: string
  unread: boolean
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface MessageDetail {
  id: string
  conversationId: string
  customerId: string
  customerName: string
  customerEmail: string
  subject: string
  status: MessageStatus
  priority: MessagePriority
  assignedTo?: string
  assignedToName?: string
  messages: {
    id: string
    senderId: string
    senderName: string
    senderType: 'customer' | 'admin'
    content: string
    attachments?: { name: string; url: string }[]
    createdAt: string
  }[]
  createdAt: string
  updatedAt: string
}

// ── Messages internes (inter-admins) ─────────────────────────────────────────

export interface InternalMessageReply {
  id: string
  fromAdminId: string
  fromAdminName: string
  content: string
  createdAt: string
}

export interface InternalMessage {
  id: string
  fromAdminId: string
  fromAdminName: string
  toAdminId: string
  toAdminName: string
  subject: string
  content: string
  isRead: boolean
  createdAt: string
  thread: InternalMessageReply[]
}

// ── Chat conversations (pont mobile → admin) ─────────────────────────────────

export interface ChatMessage {
  id: string
  senderId: string
  senderRole: string
  type: string
  content: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  replyToId?: string | null
  replyToText?: string | null
  deletedAt?: string | null
  createdAt: string
}

export interface ChatConversation {
  id: string
  customerId: string
  storeId: string
  orderId?: string | null
  subject?: string
  status: string
  createdAt: string
  updatedAt: string
  customerName?: string
  customerAvatar?: string
  customerEmail?: string
  customerPhone?: string
  customerBlocked?: boolean
  storeName?: string
  lastMessage?: string
  lastMessageAt?: string
  awaitingReply?: boolean
  messages?: ChatMessage[]
}

export interface ChatReplyPayload {
  content?: string
  type?: 'text' | 'image' | 'video' | 'pdf' | 'audio'
  attachmentUrl?: string | null
  attachmentName?: string | null
  replyToId?: string | null
}

export interface ChatConversationMedia {
  media: { id: string; type: string; url: string; name: string | null; senderRole: string; time: string }[]
  docs: { id: string; type: string; url: string; name: string | null; senderRole: string; time: string }[]
  links: { id: string; url: string; text: string; time: string }[]
}

export interface SendInternalMessageInput {
  toAdminId: string
  toAdminName: string
  subject: string
  content: string
}

export interface AdminMessageDataSource {
  // Support client
  list(params?: { page?: number; limit?: number; status?: string; priority?: string; search?: string }): Promise<{ data: MessageItem[]; total: number }>
  getById(id: string): Promise<MessageDetail>
  reply(conversationId: string, content: string): Promise<void>
  updateStatus(id: string, status: string): Promise<void>
  assign(id: string, adminId: string): Promise<void>
  getUnreadCount(): Promise<number>
  // Messages internes
  listInternalMessages(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: InternalMessage[]; total: number }>
  sendInternalMessage(input: SendInternalMessageInput): Promise<InternalMessage>
  replyInternalMessage(messageId: string, content: string): Promise<InternalMessage>
  markInternalMessageRead(messageId: string): Promise<void>
  getUnreadInternalCount(): Promise<number>
  // Chat conversations (mobile)
  listChatConversations(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<{ data: ChatConversation[]; total: number }>
  getChatConversation(id: string): Promise<ChatConversation>
  replyChatConversation(conversationId: string, payload: ChatReplyPayload): Promise<{ id: string; createdAt: string }>
  uploadChatAttachment(file: File): Promise<{ url: string; name: string; type: 'image' | 'video' | 'pdf' | 'audio' }>
  getChatConversationMedia(id: string): Promise<ChatConversationMedia>
  updateChatStatus(id: string, status: 'open' | 'closed'): Promise<void>
  setCustomerChatBlocked(customerId: string, blocked: boolean): Promise<{ customerId: string; blocked: boolean }>
  getChatAwaitingCount(): Promise<{ count: number }>
}
