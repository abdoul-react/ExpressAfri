import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { eq, and, or, like, sql, desc, inArray } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { adminTickets, ticketMessages, internalMessages, conversations, messages } from '../../database/schema'
import { customers } from '../../database/schema/customers'
import { stores } from '../../database/schema/stores'
import { PushService } from '../push/push.service'
import { pushNewMessageTitle } from '../../common/system-messages'

@Injectable()
export class AdminMessagesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private push: PushService,
  ) {}

  /** Libellé court d'un message pour les aperçus (liste, citation). */
  private preview(m: { content: string | null; attachmentName: string | null; type: string; deletedAt?: Date | null }): string {
    if (m.deletedAt) return 'Message supprimé'
    // Médias : toujours le libellé (le nom de fichier/URL est illisible) — la légende prime si présente
    if (m.type === 'image') return m.content ? `📷 ${m.content}` : '📷 Photo'
    if (m.type === 'video') return m.content ? `🎥 ${m.content}` : '🎥 Vidéo'
    if (m.type === 'audio') return '🎤 Message vocal'
    if (m.type === 'pdf') return `📄 ${m.attachmentName || 'Document'}`
    return m.content ?? ''
  }

  // ── Chat Mobile (pont admin → conversations mobile) ──

  async listChatConversations(params: { page?: number; limit?: number; search?: string; status?: string; storeId?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 30
    const offset = (page - 1) * limit

    const conditions = []
    if (params.status) conditions.push(eq(conversations.status, params.status as any))
    // Gérant de boutique : uniquement les conversations adressées à SA boutique
    if (params.storeId) conditions.push(eq(conversations.storeId, params.storeId))
    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ count }]] = await Promise.all([
      this.db.select({
        id: conversations.id,
        customerId: conversations.customerId,
        storeId: conversations.storeId,
        orderId: conversations.orderId,
        subject: conversations.subject,
        status: conversations.status,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerAvatar: customers.avatar,
        storeName: stores.name,
      })
        .from(conversations)
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .leftJoin(stores, eq(conversations.storeId, stores.id))
        .where(where)
        .limit(limit).offset(offset)
        .orderBy(desc(conversations.updatedAt)),
      this.db.select({ count: sql<number>`count(*)` }).from(conversations).where(where),
    ])

    // Dernier message de chaque conversation (une requête, pas N)
    const ids = rows.map(r => r.id)
    const lastByConv = new Map<string, { content: string | null; attachmentName: string | null; type: string; senderRole: string; createdAt: Date | null; deletedAt: Date | null }>()
    if (ids.length) {
      const msgs = await this.db.select().from(messages)
        .where(inArray(messages.conversationId, ids))
        .orderBy(messages.createdAt)
      for (const m of msgs) lastByConv.set(m.conversationId, m)
    }

    const data = rows.map(r => {
      const last = lastByConv.get(r.id)
      const customerName = `${r.customerFirstName ?? ''} ${r.customerLastName ?? ''}`.trim() || 'Client'
      return {
        id: r.id,
        customerId: r.customerId,
        storeId: r.storeId,
        orderId: r.orderId,
        subject: r.subject,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        customerName,
        customerAvatar: r.customerAvatar ?? '',
        storeName: r.storeName ?? '',
        lastMessage: last ? this.preview(last) : '',
        lastMessageAt: last?.createdAt?.toISOString() ?? r.updatedAt?.toISOString() ?? '',
        // Le dernier mot est au client → l'admin doit répondre
        awaitingReply: last ? last.senderRole === 'customer' : false,
      }
    })

    // Filtre de recherche appliqué après jointure (nom client, boutique, sujet)
    const filtered = params.search
      ? data.filter(d => {
          const q = params.search!.toLowerCase()
          return d.customerName.toLowerCase().includes(q)
            || d.storeName.toLowerCase().includes(q)
            || (d.subject ?? '').toLowerCase().includes(q)
        })
      : data

    return { data: filtered, total: Number(count) }
  }

  async getChatConversation(id: string, restrictToStoreId?: string) {
    const [conv] = await this.db.select().from(conversations)
      .where(eq(conversations.id, id)).limit(1)
    if (!conv) throw new NotFoundException('Conversation introuvable')
    // Gérant : interdit d'ouvrir une conversation d'une autre boutique
    if (restrictToStoreId && conv.storeId !== restrictToStoreId) {
      throw new ForbiddenException('Cette conversation appartient à une autre boutique')
    }

    const [msgList, [customer], [store]] = await Promise.all([
      this.db.select().from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.createdAt),
      this.db.select({ firstName: customers.firstName, lastName: customers.lastName, avatar: customers.avatar, email: customers.email, phone: customers.phone, chatBlockedAt: customers.chatBlockedAt })
        .from(customers).where(eq(customers.id, conv.customerId)).limit(1),
      this.db.select({ name: stores.name }).from(stores).where(eq(stores.id, conv.storeId)).limit(1),
    ])

    return {
      ...conv,
      customerName: `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim() || 'Client',
      customerAvatar: customer?.avatar ?? '',
      customerEmail: customer?.email ?? '',
      customerPhone: customer?.phone ?? '',
      customerBlocked: !!customer?.chatBlockedAt,
      storeName: store?.name ?? '',
      messages: msgList.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        type: m.type,
        content: m.deletedAt ? '' : m.content,
        attachmentUrl: m.deletedAt ? null : m.attachmentUrl,
        attachmentName: m.deletedAt ? null : m.attachmentName,
        replyToId: m.replyToId,
        replyToText: m.replyToId
          ? (() => {
              const r = msgList.find(x => x.id === m.replyToId)
              return r ? this.preview(r) : null
            })()
          : null,
        deletedAt: m.deletedAt,
        createdAt: m.createdAt,
      })),
    }
  }

  async replyChatConversation(
    conversationId: string,
    payload: {
      content?: string
      type?: 'text' | 'image' | 'video' | 'pdf' | 'audio'
      attachmentUrl?: string | null
      attachmentName?: string | null
      replyToId?: string | null
    },
    restrictToStoreId?: string,
  ) {
    const [conv] = await this.db.select().from(conversations)
      .where(eq(conversations.id, conversationId)).limit(1)
    if (!conv) throw new NotFoundException('Conversation introuvable')
    if (restrictToStoreId && conv.storeId !== restrictToStoreId) {
      throw new ForbiddenException('Cette conversation appartient à une autre boutique')
    }

    const type = payload.type ?? 'text'
    const trimmed = (payload.content ?? '').trim()
    if (type === 'text' && !trimmed) throw new BadRequestException('Message vide')
    if (type !== 'text' && !payload.attachmentUrl) throw new BadRequestException('Pièce jointe manquante')

    // Le message cité doit appartenir à la même conversation
    if (payload.replyToId) {
      const [target] = await this.db.select({ id: messages.id }).from(messages)
        .where(and(eq(messages.id, payload.replyToId), eq(messages.conversationId, conversationId))).limit(1)
      if (!target) throw new BadRequestException('Message cité introuvable')
    }

    const [msg] = await this.db.insert(messages).values({
      conversationId,
      senderId: 'admin',
      senderRole: 'admin',
      type,
      content: trimmed,
      attachmentUrl: payload.attachmentUrl ?? null,
      attachmentName: payload.attachmentName ?? null,
      replyToId: payload.replyToId ?? null,
    }).returning()
    await this.db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))

    // Push sur l'appareil du client pour une réponse admin/vendeur (best-effort).
    const [cust] = await this.db.select({ language: customers.language }).from(customers)
      .where(eq(customers.id, conv.customerId)).limit(1)
    await this.push.sendToCustomer(conv.customerId, {
      title: pushNewMessageTitle(cust?.language),
      body: this.preview({ content: trimmed, attachmentName: payload.attachmentName ?? null, type }).slice(0, 160),
      data: { type: 'chat', conversationId },
    })

    return msg
  }

  /** Changer le statut d'une conversation chat (open/closed) depuis l'admin. */
  async updateChatStatus(id: string, status: 'open' | 'closed', restrictToStoreId?: string) {
    if (restrictToStoreId) {
      const [existing] = await this.db.select({ storeId: conversations.storeId })
        .from(conversations).where(eq(conversations.id, id)).limit(1)
      if (!existing) throw new NotFoundException('Conversation introuvable')
      if (existing.storeId !== restrictToStoreId) {
        throw new ForbiddenException('Cette conversation appartient à une autre boutique')
      }
    }
    const [conv] = await this.db.update(conversations)
      .set({ status, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning()
    if (!conv) throw new NotFoundException('Conversation introuvable')
    return conv
  }

  /** Bloquer/débloquer un client : bloqué, il ne peut plus envoyer de messages chat. */
  async setCustomerChatBlocked(customerId: string, blocked: boolean) {
    const [c] = await this.db.update(customers)
      .set({ chatBlockedAt: blocked ? new Date() : null })
      .where(eq(customers.id, customerId))
      .returning({ id: customers.id, chatBlockedAt: customers.chatBlockedAt })
    if (!c) throw new NotFoundException('Client introuvable')
    return { customerId: c.id, blocked: !!c.chatBlockedAt }
  }

  /** Médias, documents et liens d'une conversation (panneau latéral admin). */
  async getChatConversationMedia(conversationId: string, restrictToStoreId?: string) {
    const [conv] = await this.db.select({ id: conversations.id, storeId: conversations.storeId }).from(conversations)
      .where(eq(conversations.id, conversationId)).limit(1)
    if (!conv) throw new NotFoundException('Conversation introuvable')
    if (restrictToStoreId && conv.storeId !== restrictToStoreId) {
      throw new ForbiddenException('Cette conversation appartient à une autre boutique')
    }

    const msgList = await this.db.select().from(messages)
      .where(and(eq(messages.conversationId, conversationId), sql`${messages.deletedAt} IS NULL`))
      .orderBy(desc(messages.createdAt))

    const media: { id: string; type: string; url: string; name: string | null; senderRole: string; time: string }[] = []
    const docs: { id: string; type: string; url: string; name: string | null; senderRole: string; time: string }[] = []
    const links: { id: string; url: string; text: string; time: string }[] = []
    const urlRegex = /https?:\/\/[^\s]+/g

    for (const m of msgList) {
      const time = m.createdAt?.toISOString() ?? ''
      if (m.attachmentUrl && (m.type === 'image' || m.type === 'video')) {
        media.push({ id: m.id, type: m.type, url: m.attachmentUrl, name: m.attachmentName, senderRole: m.senderRole, time })
      } else if (m.attachmentUrl && (m.type === 'pdf' || m.type === 'audio')) {
        docs.push({ id: m.id, type: m.type, url: m.attachmentUrl, name: m.attachmentName, senderRole: m.senderRole, time })
      }
      const found = m.content?.match(urlRegex)
      if (found) {
        for (const url of found) links.push({ id: `${m.id}-${links.length}`, url, text: m.content ?? '', time })
      }
    }

    return { media, docs, links }
  }

  // ── Support Tickets ──

  async list(params: { page?: number; limit?: number; status?: string; priority?: string; search?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    const offset = (page - 1) * limit
    const conditions = []
    if (params.status) conditions.push(eq(adminTickets.status, params.status as any))
    if (params.priority) conditions.push(eq(adminTickets.priority, params.priority as any))
    if (params.search) conditions.push(or(
      like(adminTickets.subject, `%${params.search}%`),
      like(adminTickets.customerName, `%${params.search}%`),
      like(adminTickets.customerEmail, `%${params.search}%`),
    ))
    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(adminTickets).where(where).limit(limit).offset(offset).orderBy(desc(adminTickets.updatedAt)),
      this.db.select({ count: sql<number>`count(*)` }).from(adminTickets).where(where),
    ])
    return { data, total: Number(count) }
  }

  async getById(id: string) {
    const [ticket] = await this.db.select().from(adminTickets).where(eq(adminTickets.id, id)).limit(1)
    if (!ticket) throw new NotFoundException('Ticket introuvable')
    const messages = await this.db.select().from(ticketMessages)
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(ticketMessages.createdAt)
    return { ...ticket, messages }
  }

  async reply(conversationId: string, content: string) {
    const [ticket] = await this.db.select().from(adminTickets).where(eq(adminTickets.id, conversationId)).limit(1)
    if (!ticket) throw new NotFoundException('Ticket introuvable')
    await this.db.insert(ticketMessages).values({
      ticketId: conversationId,
      senderId: 'admin',
      senderName: 'Admin',
      senderType: 'admin',
      content,
    })
    await this.db.update(adminTickets).set({
      lastMessage: content,
      unread: false,
      messageCount: sql`${adminTickets.messageCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(adminTickets.id, conversationId))
  }

  async updateStatus(id: string, status: string) {
    const [ticket] = await this.db.update(adminTickets).set({ status: status as any, updatedAt: new Date() })
      .where(eq(adminTickets.id, id)).returning()
    if (!ticket) throw new NotFoundException('Ticket introuvable')
  }

  async assign(id: string, adminId: string) {
    const [ticket] = await this.db.update(adminTickets).set({ assignedTo: adminId, updatedAt: new Date() })
      .where(eq(adminTickets.id, id)).returning()
    if (!ticket) throw new NotFoundException('Ticket introuvable')
  }

  async getUnreadCount() {
    const [result] = await this.db.select({ count: sql<number>`count(*)` })
      .from(adminTickets).where(eq(adminTickets.unread, true))
    return Number(result.count)
  }

  // ── Internal Messages ──

  async listInternalMessages(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    const offset = (page - 1) * limit
    const conditions = []
    if (params.search) conditions.push(or(
      like(internalMessages.subject, `%${params.search}%`),
      like(internalMessages.content, `%${params.search}%`),
    ))
    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(internalMessages).where(where).limit(limit).offset(offset).orderBy(desc(internalMessages.createdAt)),
      this.db.select({ count: sql<number>`count(*)` }).from(internalMessages).where(where),
    ])
    return { data, total: Number(count) }
  }

  async sendInternalMessage(input: { toAdminId: string; toAdminName: string; subject: string; content: string }) {
    const [msg] = await this.db.insert(internalMessages).values({
      fromAdminId: '00000000-0000-0000-0000-000000000000',
      fromAdminName: 'Admin',
      ...input,
    }).returning()
    return msg
  }

  async replyInternalMessage(messageId: string, content: string) {
    const [msg] = await this.db.select().from(internalMessages).where(eq(internalMessages.id, messageId)).limit(1)
    if (!msg) throw new NotFoundException('Message introuvable')
    const reply = { id: crypto.randomUUID(), fromAdminId: '00000000-0000-0000-0000-000000000000', fromAdminName: 'Admin', content, createdAt: new Date().toISOString() }
    const thread = [...(msg.thread ?? []), reply]
    await this.db.update(internalMessages).set({ thread, isRead: false }).where(eq(internalMessages.id, messageId))
    return { ...msg, thread }
  }

  async markInternalMessageRead(messageId: string) {
    await this.db.update(internalMessages).set({ isRead: true }).where(eq(internalMessages.id, messageId))
  }

  async getUnreadInternalCount() {
    const [result] = await this.db.select({ count: sql<number>`count(*)` })
      .from(internalMessages).where(eq(internalMessages.isRead, false))
    return Number(result.count)
  }
}
