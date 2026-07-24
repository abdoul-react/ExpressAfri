import type {
  AdminMessageDataSource,
  MessageItem,
  MessageDetail,
  MessageStatus,
  InternalMessage,
  SendInternalMessageInput,
  ChatConversation,
  ChatReplyPayload,
  ChatConversationMedia,
} from '../AdminMessageDataSource'
import api from '@/lib/api'

export class ApiAdminMessageDataSource implements AdminMessageDataSource {
  async list(params?: { page?: number; limit?: number; status?: string; priority?: string; search?: string }) {
    const { data } = await api.get('/messages', { params })
    return data as { data: MessageItem[]; total: number }
  }

  async getById(id: string) {
    const { data } = await api.get(`/messages/${id}`)
    return data as MessageDetail
  }

  async reply(conversationId: string, content: string) {
    await api.post(`/messages/${conversationId}/reply`, { content })
  }

  async updateStatus(id: string, status: MessageStatus) {
    await api.patch(`/messages/${id}/status`, { status })
  }

  async assign(id: string, adminId: string) {
    await api.patch(`/messages/${id}/assign`, { adminId })
  }

  async getUnreadCount() {
    const { data } = await api.get('/messages/unread-count')
    return data as number
  }

  async listInternalMessages(params?: { page?: number; limit?: number; search?: string }) {
    const { data } = await api.get('/messages/internal', { params })
    return data as { data: InternalMessage[]; total: number }
  }

  async sendInternalMessage(input: SendInternalMessageInput) {
    const { data } = await api.post('/messages/internal', input)
    return data as InternalMessage
  }

  async replyInternalMessage(messageId: string, content: string) {
    const { data } = await api.post(`/messages/internal/${messageId}/reply`, { content })
    return data as InternalMessage
  }

  async markInternalMessageRead(messageId: string) {
    await api.patch(`/messages/internal/${messageId}/read`)
  }

  async getUnreadInternalCount() {
    const { data } = await api.get('/messages/internal/unread-count')
    return data as number
  }

  async listChatConversations(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const { data } = await api.get('/messages/chat', { params })
    return data as { data: ChatConversation[]; total: number }
  }

  async getChatConversation(id: string) {
    const { data } = await api.get(`/messages/chat/${id}`)
    return data as ChatConversation
  }

  async replyChatConversation(conversationId: string, payload: ChatReplyPayload): Promise<{ id: string; createdAt: string }> {
    const { data } = await api.post(`/messages/chat/${conversationId}/reply`, payload)
    return data as { id: string; createdAt: string }
  }

  async uploadChatAttachment(file: File) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/messages/chat/attachments', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data as { url: string; name: string; type: 'image' | 'video' | 'pdf' | 'audio' }
  }

  async getChatConversationMedia(id: string) {
    const { data } = await api.get(`/messages/chat/${id}/media`)
    return data as ChatConversationMedia
  }

  async updateChatStatus(id: string, status: 'open' | 'closed') {
    await api.patch(`/messages/chat/${id}/status`, { status })
  }

  async setCustomerChatBlocked(customerId: string, blocked: boolean) {
    const { data } = await api.patch(`/messages/chat/customers/${customerId}/block`, { blocked })
    return data as { customerId: string; blocked: boolean }
  }

  async getChatAwaitingCount() {
    const { data } = await api.get('/messages/chat/awaiting-count')
    return data as { count: number }
  }
}
