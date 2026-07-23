import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { eq, and, or, desc, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { conversations, messages } from '../../database/schema/chat'
import { adminTickets } from '../../database/schema/admin-messages'
import { orders, orderItems } from '../../database/schema/orders'
import { stores } from '../../database/schema/stores'
import { customers } from '../../database/schema/customers'
import { PushService } from '../push/push.service'
import { pushOrderTitle } from '../../common/system-messages'

@Injectable()
export class ChatService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private push: PushService,
  ) {}

  /** Libellé court d'un message pour les aperçus (dernier message, citation). */
  private preview(m: { content: string | null; attachmentName: string | null; type: string }): string {
    // Médias : toujours le libellé (le nom de fichier/URL est illisible) — la légende prime si présente
    if (m.type === 'image') return m.content ? `📷 ${m.content}` : '📷 Photo'
    if (m.type === 'video') return m.content ? `🎥 ${m.content}` : '🎥 Vidéo'
    if (m.type === 'audio') return '🎤 Message vocal'
    if (m.type === 'pdf') return `📄 ${m.attachmentName || 'Document'}`
    return m.content ?? ''
  }

  // ── Conversations ──

  async listConversations(customerId: string) {
    return this.db.select().from(conversations).where(eq(conversations.customerId, customerId)).orderBy(desc(conversations.updatedAt))
  }

  async getConversation(id: string, customerId: string) {
    const [conv] = await this.db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.customerId, customerId))).limit(1)
    if (!conv) throw new NotFoundException('Conversation introuvable')
    const msgList = await this.db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt)

    // Nom de la boutique pour l'en-tête du chat
    const [store] = await this.db.select({ name: stores.name }).from(stores).where(eq(stores.id, conv.storeId)).limit(1)

    // Contexte commande (premier article) si la conversation y est liée
    let orderRef: string | null = null
    let orderProduct: string | null = null
    let orderImage: string | null = null
    if (conv.orderId) {
      const [order] = await this.db.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, conv.orderId)).limit(1)
      if (order) {
        orderRef = order.orderNumber
        const [item] = await this.db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).limit(1)
        orderProduct = item?.label ?? null
        orderImage = item?.imageUrl ?? null
      }
    }

    // Format attendu par l'app mobile (name/avatar + messages {text, sentByMe, time})
    return {
      id: conv.id,
      name: store?.name ?? conv.subject ?? 'Vendeur',
      avatar: '',
      online: false,
      lastMessage: (() => {
        const last = msgList[msgList.length - 1]
        if (!last || last.deletedAt) return ''
        return this.preview(last)
      })(),
      lastTime: msgList[msgList.length - 1]?.createdAt?.toISOString() ?? '',
      unread: msgList.filter(m => !m.readAt && m.senderRole !== 'customer').length,
      status: conv.status,
      orderRef,
      orderProduct,
      orderImage,
      messages: msgList.map(m => ({
        id: m.id,
        text: m.deletedAt ? '' : m.content,
        type: m.type,
        attachmentUrl: m.deletedAt ? null : m.attachmentUrl,
        attachmentName: m.deletedAt ? null : m.attachmentName,
        replyToId: m.replyToId,
        // Aperçu du message cité (texte, ou libellé de la pièce jointe)
        replyToText: m.replyToId
          ? (() => {
              const r = msgList.find(x => x.id === m.replyToId)
              if (!r) return null
              if (r.deletedAt) return ''
              return this.preview(r)
            })()
          : null,
        deleted: !!m.deletedAt,
        sentByMe: m.senderRole === 'customer',
        time: m.createdAt?.toISOString() ?? '',
      })),
    }
  }

  async createConversation(data: { customerId: string; storeId?: string; orderId?: string; subject?: string }) {
    let storeId = data.storeId

    // Conversation liée à une commande : vérifier l'appartenance et dériver la boutique
    if (data.orderId) {
      const [order] = await this.db.select().from(orders)
        .where(and(eq(orders.id, data.orderId), eq(orders.customerId, data.customerId))).limit(1)
      if (!order) throw new NotFoundException('Commande introuvable')
      storeId = storeId ?? order.storeId

      // Une seule conversation ouverte par commande : la réutiliser si elle existe
      const [existing] = await this.db.select().from(conversations)
        .where(and(
          eq(conversations.customerId, data.customerId),
          eq(conversations.orderId, data.orderId),
          eq(conversations.status, 'open'),
        )).limit(1)
      if (existing) return existing
    }

    if (!storeId) throw new BadRequestException('storeId ou orderId requis')

    const [conv] = await this.db.insert(conversations).values({
      customerId: data.customerId,
      storeId,
      orderId: data.orderId,
      subject: data.subject,
    }).returning()

    // Créer un ticket support correspondant pour l'admin
    await this.db.insert(adminTickets).values({
      subject: data.subject ?? 'Nouvelle conversation client',
      customerName: data.customerId,
      customerEmail: '',
      status: 'open',
      priority: 'medium',
      lastMessage: '',
      unread: true,
      messageCount: 0,
      chatConversationId: conv.id,
    })

    return conv
  }

  /**
   * Notification système poussée dans la BOÎTE DE RÉCEPTION du client : un
   * message « vendeur » dans la conversation liée à la commande (créée si elle
   * n'existe pas encore). Utilisée par les changements de statut de commande
   * (validation/expédition/livraison) et par l'envoi de reçu.
   *
   * Best-effort : une notification qui échoue ne doit JAMAIS bloquer l'action
   * métier sous-jacente — on avale donc l'erreur volontairement.
   */
  async postOrderSystemMessage(
    orderId: string,
    content: string,
    opts?: { attachmentUrl?: string | null; attachmentName?: string | null; type?: 'text' | 'pdf' | 'image' },
  ): Promise<void> {
    try {
      const text = (content ?? '').trim()
      if (!text && !opts?.attachmentUrl) return

      const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
      if (!order || !order.customerId) return

      // Réutilise la conversation ouverte de la commande, ou la crée (+ ticket
      // admin) via la logique existante « une conversation par commande ».
      const conv = await this.createConversation({
        customerId: order.customerId,
        storeId: order.storeId,
        orderId,
        subject: `Commande ${order.orderNumber}`,
      })

      await this.db.insert(messages).values({
        conversationId: conv.id,
        senderId: 'system',
        senderRole: 'admin',
        type: opts?.type ?? 'text',
        content: text,
        attachmentUrl: opts?.attachmentUrl ?? null,
        attachmentName: opts?.attachmentName ?? null,
      })
      await this.db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conv.id))

      // Refléter l'activité côté back-office (aperçu + pastille non-lu)
      await this.db.update(adminTickets)
        .set({ lastMessage: text.slice(0, 160), unread: true, updatedAt: new Date() })
        .where(eq(adminTickets.chatConversationId, conv.id))

      const [customer] = await this.db.select({ language: customers.language }).from(customers)
        .where(eq(customers.id, order.customerId)).limit(1)
      // Push sur l'appareil du client (best-effort). Couvre les changements de
      // statut de commande ET l'envoi de reçu (les deux passent par ici).
      await this.push.sendToCustomer(order.customerId, {
        title: pushOrderTitle(order.orderNumber, customer?.language),
        body: text.slice(0, 160),
        data: { type: 'order', orderId, conversationId: conv.id },
      })
    } catch (e) {
      console.error(`[ChatService] postOrderSystemMessage échoué pour orderId=${orderId}:`, e)
    }
  }

  async closeConversation(id: string, customerId: string) {
    const [conv] = await this.db.update(conversations).set({ status: 'closed', updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.customerId, customerId)))
      .returning()
    if (!conv) throw new NotFoundException('Conversation introuvable')
    return conv
  }

  // ── Messages ──

  async sendMessage(
    conversationId: string,
    sender: { id: string; role: string },
    payload: {
      content?: string
      type?: 'text' | 'image' | 'video' | 'pdf' | 'audio'
      attachmentUrl?: string | null
      attachmentName?: string | null
      replyToId?: string | null
    },
  ) {
    const type = payload.type ?? 'text'
    const content = (payload.content ?? '').trim()
    if (type === 'text' && !content) throw new BadRequestException('Message vide')
    if (type !== 'text' && !payload.attachmentUrl) throw new BadRequestException('Pièce jointe manquante')

    // Client bloqué par l'admin : envoi refusé
    if (sender.role === 'customer') {
      const [c] = await this.db.select({ chatBlockedAt: customers.chatBlockedAt }).from(customers)
        .where(eq(customers.id, sender.id)).limit(1)
      if (c?.chatBlockedAt) throw new ForbiddenException('Vous ne pouvez plus envoyer de messages')
    }

    // Le message cité doit appartenir à la même conversation
    if (payload.replyToId) {
      const [target] = await this.db.select({ id: messages.id }).from(messages)
        .where(and(eq(messages.id, payload.replyToId), eq(messages.conversationId, conversationId))).limit(1)
      if (!target) throw new BadRequestException('Message cité introuvable')
    }

    const [msg] = await this.db.insert(messages).values({
      conversationId,
      senderId: sender.id,
      senderRole: sender.role as any,
      type,
      content,
      attachmentUrl: payload.attachmentUrl ?? null,
      attachmentName: payload.attachmentName ?? null,
      replyToId: payload.replyToId ?? null,
    }).returning()
    await this.db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId))
    return msg
  }

  /** Suppression « pour tous » : l'auteur uniquement, soft-delete (la bulle devient « message supprimé »). */
  async deleteMessage(conversationId: string, messageId: string, customerId: string) {
    // Vérifier que la conversation appartient au client
    const [conv] = await this.db.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.customerId, customerId))).limit(1)
    if (!conv) throw new NotFoundException('Conversation introuvable')

    const [msg] = await this.db.select().from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId))).limit(1)
    if (!msg) throw new NotFoundException('Message introuvable')
    // On ne supprime que ses propres messages
    if (msg.senderRole !== 'customer' || msg.senderId !== customerId) {
      throw new BadRequestException('Vous ne pouvez supprimer que vos propres messages')
    }

    await this.db.update(messages)
      .set({ deletedAt: new Date(), content: '', attachmentUrl: null, attachmentName: null })
      .where(eq(messages.id, messageId))
    return { ok: true }
  }

  async archiveConversation(id: string, customerId: string) {
    const [conv] = await this.db.update(conversations).set({ status: 'closed', updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.customerId, customerId)))
      .returning()
    if (!conv) throw new NotFoundException('Conversation introuvable')
    return conv
  }

  async markAsRead(conversationId: string, customerId: string) {
    const [conv] = await this.db.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.customerId, customerId))).limit(1)
    if (!conv) throw new NotFoundException('Conversation introuvable')
    await this.db.update(messages).set({ readAt: new Date() })
      .where(and(eq(messages.conversationId, conversationId), sql`${messages.readAt} IS NULL`))
    return { ok: true }
  }

  /**
   * Historique des médias/documents/liens d'une conversation
   * (pour la page « Médias & liens » du menu ⋮).
   */
  async getConversationMedia(conversationId: string, customerId: string) {
    const [conv] = await this.db.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.customerId, customerId))).limit(1)
    if (!conv) throw new NotFoundException('Conversation introuvable')

    const msgList = await this.db.select().from(messages)
      .where(and(eq(messages.conversationId, conversationId), sql`${messages.deletedAt} IS NULL`))
      .orderBy(desc(messages.createdAt))

    const media: { id: string; type: string; url: string; name: string | null; time: string }[] = []
    const docs: { id: string; type: string; url: string; name: string | null; time: string }[] = []
    const links: { id: string; url: string; text: string; time: string }[] = []
    const urlRegex = /https?:\/\/[^\s]+/g

    for (const m of msgList) {
      const time = m.createdAt?.toISOString() ?? ''
      if (m.attachmentUrl && (m.type === 'image' || m.type === 'video')) {
        media.push({ id: m.id, type: m.type, url: m.attachmentUrl, name: m.attachmentName, time })
      } else if (m.attachmentUrl && (m.type === 'pdf' || m.type === 'audio')) {
        docs.push({ id: m.id, type: m.type, url: m.attachmentUrl, name: m.attachmentName, time })
      }
      // Liens détectés dans le texte (même sur un message avec pièce jointe)
      const found = m.content?.match(urlRegex)
      if (found) {
        for (const url of found) links.push({ id: `${m.id}-${links.length}`, url, text: m.content ?? '', time })
      }
    }

    return { media, docs, links }
  }
}
