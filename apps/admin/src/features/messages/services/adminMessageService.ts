import { adminMessageDataSource } from '@/infrastructure/data-source'
import type { SendInternalMessageInput, ChatReplyPayload } from '@/infrastructure/data-source/AdminMessageDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminMessageService {
  async list(params?: { page?: number; limit?: number; status?: string; priority?: string; search?: string }) {
    try {
      return await adminMessageDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des messages')
    }
  }
  async getById(id: string) {
    try {
      return await adminMessageDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du message')
    }
  }
  async reply(conversationId: string, content: string) {
    try {
      return await adminMessageDataSource.reply(conversationId, content)
    } catch (err) {
      throw toServiceError(err, 'Réponse au message')
    }
  }
  async updateStatus(id: string, status: string) {
    try {
      return await adminMessageDataSource.updateStatus(id, status)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du statut du message')
    }
  }
  async assign(id: string, adminId: string) {
    try {
      return await adminMessageDataSource.assign(id, adminId)
    } catch (err) {
      throw toServiceError(err, 'Assignation du message')
    }
  }
  async getUnreadCount() {
    try {
      return await adminMessageDataSource.getUnreadCount()
    } catch (err) {
      throw toServiceError(err, 'Récupération du nombre de messages non lus')
    }
  }

  async listInternalMessages(params?: { page?: number; limit?: number; search?: string }) {
    try {
      return await adminMessageDataSource.listInternalMessages(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des messages internes')
    }
  }
  async sendInternalMessage(input: SendInternalMessageInput) {
    try {
      return await adminMessageDataSource.sendInternalMessage(input)
    } catch (err) {
      throw toServiceError(err, 'Envoi du message interne')
    }
  }
  async replyInternalMessage(messageId: string, content: string) {
    try {
      return await adminMessageDataSource.replyInternalMessage(messageId, content)
    } catch (err) {
      throw toServiceError(err, 'Réponse au message interne')
    }
  }
  async markInternalMessageRead(messageId: string) {
    try {
      return await adminMessageDataSource.markInternalMessageRead(messageId)
    } catch (err) {
      throw toServiceError(err, 'Marquage du message comme lu')
    }
  }
  async getUnreadInternalCount() {
    try {
      return await adminMessageDataSource.getUnreadInternalCount()
    } catch (err) {
      throw toServiceError(err, 'Récupération du nombre de messages internes non lus')
    }
  }

  async listChatConversations(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    try {
      return await adminMessageDataSource.listChatConversations(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des conversations chat')
    }
  }
  async getChatConversation(id: string) {
    try {
      return await adminMessageDataSource.getChatConversation(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la conversation chat')
    }
  }
  async replyChatConversation(conversationId: string, payload: ChatReplyPayload) {
    try {
      return await adminMessageDataSource.replyChatConversation(conversationId, payload)
    } catch (err) {
      throw toServiceError(err, 'Réponse à la conversation chat')
    }
  }
  async uploadChatAttachment(file: File) {
    try {
      return await adminMessageDataSource.uploadChatAttachment(file)
    } catch (err) {
      throw toServiceError(err, 'Upload de la pièce jointe chat')
    }
  }
  async getChatConversationMedia(id: string) {
    try {
      return await adminMessageDataSource.getChatConversationMedia(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération des médias de la conversation')
    }
  }
  async updateChatStatus(id: string, status: 'open' | 'closed') {
    try {
      return await adminMessageDataSource.updateChatStatus(id, status)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du statut de la conversation')
    }
  }
  async setCustomerChatBlocked(customerId: string, blocked: boolean) {
    try {
      return await adminMessageDataSource.setCustomerChatBlocked(customerId, blocked)
    } catch (err) {
      throw toServiceError(err, 'Blocage/déblocage du chat client')
    }
  }
}

export const adminMessageService = new AdminMessageService()
