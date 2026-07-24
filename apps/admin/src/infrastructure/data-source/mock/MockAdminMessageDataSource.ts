import type {
  AdminMessageDataSource,
  MessageItem,
  MessageDetail,
  MessageStatus,
  InternalMessage,
  SendInternalMessageInput,
  ChatConversation,
} from '../AdminMessageDataSource'
import { MOCK_MESSAGES, MOCK_MESSAGE_DETAILS } from './data/mockMessages'

let messages = [...MOCK_MESSAGES]

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

let internalIdCounter = 10

// Données mock pour la messagerie interne
let MOCK_INTERNAL_MESSAGES: InternalMessage[] = [
  {
    id: 'int_001',
    fromAdminId: 'admin_001',
    fromAdminName: 'Abdou Super Admin',
    toAdminId: 'admin_005',
    toAdminName: 'Moussa Support Agent',
    subject: 'Procédure remboursement urgente',
    content: 'Bonjour Moussa, peux-tu vérifier le dossier remboursement de Aminata Diallo (conv_001) ? Le client est prioritaire.',
    isRead: true,
    createdAt: ago(5),
    thread: [
      {
        id: 'int_001_r1',
        fromAdminId: 'admin_005',
        fromAdminName: 'Moussa Support Agent',
        content: 'Reçu, je m\'en occupe maintenant. Je reviens vers toi dans 30 min.',
        createdAt: ago(4.5),
      },
      {
        id: 'int_001_r2',
        fromAdminId: 'admin_001',
        fromAdminName: 'Abdou Super Admin',
        content: 'Parfait, merci Moussa.',
        createdAt: ago(4),
      },
    ],
  },
  {
    id: 'int_002',
    fromAdminId: 'admin_003',
    fromAdminName: 'Fatou Order Admin',
    toAdminId: 'admin_001',
    toAdminName: 'Abdou Super Admin',
    subject: 'Pic de commandes ce week-end',
    content: 'Salut, on a eu +40% de commandes ce week-end. Je pense qu\'on devrait ajouter des créneaux de livraison. Qu\'en penses-tu ?',
    isRead: false,
    createdAt: ago(2),
    thread: [],
  },
  {
    id: 'int_003',
    fromAdminId: 'admin_001',
    fromAdminName: 'Abdou Super Admin',
    toAdminId: 'admin_002',
    toAdminName: 'Kofi Product Admin',
    subject: 'Mise à jour catalogue promotions',
    content: 'Kofi, il faut mettre à jour les prix du catalogue avant vendredi pour la promo de la semaine prochaine. On a la campagne qui démarre lundi.',
    isRead: true,
    createdAt: ago(24),
    thread: [
      {
        id: 'int_003_r1',
        fromAdminId: 'admin_002',
        fromAdminName: 'Kofi Product Admin',
        content: 'Noté. Je commence dès demain matin. Combien de produits sont concernés ?',
        createdAt: ago(23),
      },
    ],
  },
  {
    id: 'int_004',
    fromAdminId: 'admin_004',
    fromAdminName: 'Sékou Logistics Admin',
    toAdminId: 'admin_001',
    toAdminName: 'Abdou Super Admin',
    subject: 'Problème livreur del_004',
    content: 'Le livreur Traoré Souleymane (del_004) a eu 2 échecs de livraison consécutifs cette semaine. Je recommande une vérification de son dossier.',
    isRead: false,
    createdAt: ago(1),
    thread: [],
  },
  {
    id: 'int_005',
    fromAdminId: 'admin_005',
    fromAdminName: 'Moussa Support Agent',
    toAdminId: 'admin_003',
    toAdminName: 'Fatou Order Admin',
    subject: 'Commande bloquée ord_501',
    content: 'Fatou, la commande ord_501 est bloquée en statut "prête" depuis 3 jours. Peux-tu regarder de ton côté ?',
    isRead: true,
    createdAt: ago(10),
    thread: [
      {
        id: 'int_005_r1',
        fromAdminId: 'admin_003',
        fromAdminName: 'Fatou Order Admin',
        content: 'Je vois le problème, c\'est un souci de stock. Je le remonte au fournisseur.',
        createdAt: ago(9),
      },
      {
        id: 'int_005_r2',
        fromAdminId: 'admin_005',
        fromAdminName: 'Moussa Support Agent',
        content: 'OK merci, j\'informe le client.',
        createdAt: ago(8.5),
      },
    ],
  },
]

export class MockAdminMessageDataSource implements AdminMessageDataSource {
  private delay(ms = 200) { return new Promise<void>((r) => setTimeout(r, ms)) }

  // ── Support client ──────────────────────────────────────────────────────────

  async list(params?: { page?: number; limit?: number; status?: string; priority?: string; search?: string }) {
    await this.delay()
    let filtered = [...messages]
    if (params?.status) filtered = filtered.filter((m) => m.status === params.status)
    if (params?.priority) filtered = filtered.filter((m) => m.priority === params.priority)
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((m) =>
        m.subject.toLowerCase().includes(s) ||
        m.customerName.toLowerCase().includes(s) ||
        m.lastMessage.toLowerCase().includes(s)
      )
    }
    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const page = params?.page ?? 1
    const limit = params?.limit ?? 15
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length }
  }

  async getById(id: string): Promise<MessageDetail> {
    await this.delay()
    const msg = MOCK_MESSAGE_DETAILS[id]
    if (!msg) {
      const item = messages.find((m) => m.id === id || m.conversationId === id)
      if (!item) throw new Error('Message introuvable')
      return {
        ...item,
        messages: [
          { id: `${item.id}_m1`, senderId: item.customerId, senderName: item.customerName, senderType: 'customer' as const, content: item.lastMessage, createdAt: item.createdAt },
        ],
      } as MessageDetail
    }
    return { ...msg } as MessageDetail
  }

  async reply(conversationId: string, content: string) {
    await this.delay(300)
    const idx = messages.findIndex((m) => m.conversationId === conversationId)
    if (idx > -1) {
      messages[idx] = {
        ...messages[idx],
        lastMessage: content,
        updatedAt: new Date().toISOString(),
        unread: false,
        status: 'in_progress',
        messageCount: messages[idx].messageCount + 1,
      }
    }
  }

  async updateStatus(id: string, status: MessageStatus) {
    await this.delay()
    const idx = messages.findIndex((m) => m.id === id || m.conversationId === id)
    if (idx > -1) messages[idx] = { ...messages[idx], status, updatedAt: new Date().toISOString() }
  }

  async assign(id: string, adminId: string) {
    await this.delay()
    const idx = messages.findIndex((m) => m.id === id || m.conversationId === id)
    if (idx > -1) messages[idx] = { ...messages[idx], assignedTo: adminId, assignedToName: 'Support Agent', updatedAt: new Date().toISOString() }
  }

  async getUnreadCount() {
    await this.delay(100)
    return messages.filter((m) => m.unread).length
  }

  // ── Messages internes ───────────────────────────────────────────────────────

  async listInternalMessages(params?: { page?: number; limit?: number; search?: string }) {
    await this.delay()
    let filtered = [...MOCK_INTERNAL_MESSAGES]
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((m) =>
        m.subject.toLowerCase().includes(s) ||
        m.fromAdminName.toLowerCase().includes(s) ||
        m.toAdminName.toLowerCase().includes(s) ||
        m.content.toLowerCase().includes(s)
      )
    }
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const page = params?.page ?? 1
    const limit = params?.limit ?? 15
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length }
  }

  async sendInternalMessage(input: SendInternalMessageInput): Promise<InternalMessage> {
    await this.delay(300)
    const newMsg: InternalMessage = {
      id: `int_0${String(++internalIdCounter).padStart(2, '0')}`,
      fromAdminId: 'admin_001', // admin courant simulé
      fromAdminName: 'Abdou Super Admin',
      toAdminId: input.toAdminId,
      toAdminName: input.toAdminName,
      subject: input.subject,
      content: input.content,
      isRead: false,
      createdAt: new Date().toISOString(),
      thread: [],
    }
    MOCK_INTERNAL_MESSAGES = [newMsg, ...MOCK_INTERNAL_MESSAGES]
    return newMsg
  }

  async replyInternalMessage(messageId: string, content: string): Promise<InternalMessage> {
    await this.delay(300)
    const idx = MOCK_INTERNAL_MESSAGES.findIndex((m) => m.id === messageId)
    if (idx === -1) throw new Error('Message introuvable')
    const reply = {
      id: `${messageId}_r${MOCK_INTERNAL_MESSAGES[idx].thread.length + 1}`,
      fromAdminId: 'admin_001',
      fromAdminName: 'Abdou Super Admin',
      content,
      createdAt: new Date().toISOString(),
    }
    MOCK_INTERNAL_MESSAGES[idx] = {
      ...MOCK_INTERNAL_MESSAGES[idx],
      thread: [...MOCK_INTERNAL_MESSAGES[idx].thread, reply],
    }
    return MOCK_INTERNAL_MESSAGES[idx]
  }

  async markInternalMessageRead(messageId: string): Promise<void> {
    await this.delay(100)
    const idx = MOCK_INTERNAL_MESSAGES.findIndex((m) => m.id === messageId)
    if (idx > -1) MOCK_INTERNAL_MESSAGES[idx] = { ...MOCK_INTERNAL_MESSAGES[idx], isRead: true }
  }

  async getUnreadInternalCount(): Promise<number> {
    await this.delay(100)
    return MOCK_INTERNAL_MESSAGES.filter((m) => !m.isRead).length
  }

  // ── Chat conversations (mobile) ──────────────────────────────────────────────

  async listChatConversations(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    await this.delay()
    return { data: [], total: 0 }
  }

  async getChatConversation(id: string): Promise<ChatConversation> {
    await this.delay()
    throw new Error('Not implemented in mock')
  }

  async replyChatConversation(conversationId: string, _payload: import('../AdminMessageDataSource').ChatReplyPayload): Promise<{ id: string; createdAt: string }> {
    await this.delay(300)
    return { id: `chat_msg_${Date.now()}`, createdAt: new Date().toISOString() }
  }

  async uploadChatAttachment(_file: File) {
    await this.delay(300)
    return { url: '/uploads/chat/mock.png', name: 'mock.png', type: 'image' as const }
  }

  async getChatConversationMedia(_id: string): Promise<import('../AdminMessageDataSource').ChatConversationMedia> {
    await this.delay()
    return { media: [], docs: [], links: [] }
  }

  async updateChatStatus(_id: string, _status: 'open' | 'closed') {
    await this.delay(200)
  }

  async setCustomerChatBlocked(customerId: string, blocked: boolean) {
    await this.delay(200)
    return { customerId, blocked }
  }

  async getChatAwaitingCount() {
    await this.delay()
    return { count: 0 }
  }
}
