import { Injectable } from '@nestjs/common'
import { ChatService } from '../chat/chat.service'

@Injectable()
export class OrderEventsListener {
  constructor(private chatService: ChatService) {}

  async onOrderStatusChange(orderId: string, newStatus: string, details?: string) {
    const systemMessages: Record<string, string> = {
      confirmed: '✅ Votre commande a été confirmée. Nous préparons vos articles.',
      processing: '📦 Votre commande est en cours de préparation.',
      shipped: '🚚 Votre commande a été expédiée ! Vous serez livré sous 2-5 jours.',
      delivered: '🎉 Votre commande a été livrée. Merci pour votre achat !',
      cancelled: '❌ Votre commande a été annulée.',
      refunded: '💰 Votre remboursement a été effectué.',
    }

    const content = systemMessages[newStatus] ?? `Statut mis à jour : ${newStatus}`
    const fullContent = details ? `${content}\n${details}` : content

    await this.chatService.postOrderSystemMessage(orderId, fullContent)
  }

  async onShipmentCreated(orderId: string, trackingNumber?: string) {
    let message = '📦 Une expédition a été créée pour votre commande.'
    if (trackingNumber) {
      message += `\nNuméro de suivi : ${trackingNumber}`
    }
    await this.onOrderStatusChange(orderId, 'shipment_created', message)
  }

  async onItemIssue(orderId: string, itemName: string, reason: string) {
    const message = `⚠️ Un problème a été signalé sur l'article "${itemName}" : ${reason}. Notre équipe vous contactera.`
    await this.onOrderStatusChange(orderId, 'item_issue', message)
  }
}
