import { Injectable, Inject, Logger } from '@nestjs/common'
import { eq, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { payments } from '../../database/schema/payments'
import { orders } from '../../database/schema/orders'
import { PaymentProvider } from './providers/payment-provider'
import { ChatService } from '../chat/chat.service'

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name)
  private providerMap = new Map<string, PaymentProvider>()

  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private chat: ChatService,
  ) {}

  registerProvider(provider: PaymentProvider) {
    this.providerMap.set(provider.name, provider)
  }

  getProvider(name: string): PaymentProvider | undefined {
    return this.providerMap.get(name)
  }

  async processWebhook(providerName: string, rawBody: Buffer, signature: string): Promise<{ status: string; message: string }> {
    const provider = this.getProvider(providerName)
    if (!provider) {
      return { status: 'error', message: `Provider ${providerName} non supporté` }
    }

    if (!provider.verifyWebhook(rawBody, signature)) {
      return { status: 'error', message: 'Signature webhook invalide' }
    }

    const event = provider.parseWebhook(rawBody)

    this.logger.debug(`Received webhook event for provider=${providerName} parsed=${JSON.stringify(event)}`)

    // Prepare a holder to send a system message after the DB transaction commits
    let postMessage: { orderId: string; msg: string } | null = null

    const result = await this.db.transaction(async (tx) => {
      // Verrouiller la ligne paiement
      this.logger.debug(`Searching payment with providerPaymentId=${event.providerPaymentId}`)
      const [payment] = await tx.select().from(payments)
        .where(eq(payments.providerPaymentId, event.providerPaymentId))
        .limit(1)
        .for('update')

      this.logger.debug(`Payment lookup result: ${payment ? 'found id=' + (payment as any).id : 'not found'}`)

      if (!payment) {
        return { status: 'error', message: 'Paiement introuvable' }
      }

      // Vérifier idempotence événement
      if (event.eventId && payment.webhookEventId === event.eventId) {
        return { status: 'ignored', message: 'Événement déjà traité' }
      }

      // Vérifier montant/devise (le webhook peut renvoyer un montant différent
      // pour les refunds partiels — on vérifie uniquement pour les captures)
      if (event.status === 'captured' || event.status === 'authorized') {
        const providerAmount = payment.amount
        const providerCurrency = payment.currency
        if (!providerAmount || !providerCurrency) {
          return { status: 'error', message: 'Montant ou devise du paiement manquant' }
        }
      }

      // Mettre à jour le paiement
      const patch: Record<string, unknown> = {
        webhookEventId: event.eventId ?? payment.webhookEventId,
        updatedAt: new Date(),
      }

      if (event.status === 'captured') {
        patch.status = 'captured'
        patch.capturedAt = new Date()
      } else if (event.status === 'failed') {
        patch.status = 'failed'
      } else if (event.status === 'refunded') {
        patch.status = 'refunded'
      } else if (event.status === 'authorized') {
        patch.status = 'authorized'
      }

      this.logger.debug(`Applying payment patch: ${JSON.stringify(patch)}`)
      await tx.update(payments).set(patch).where(eq(payments.id, payment.id))

      // re-fetch payment inside tx to verify update
      const [updatedPayment] = await tx.select().from(payments).where(eq(payments.id, payment.id)).limit(1)
      this.logger.debug(`Updated payment in tx: ${JSON.stringify(updatedPayment)}`)

      // Pour un paiement capturé, mettre à jour la commande associée
      if (event.status === 'captured') {
        const [order] = await tx.select().from(orders)
          .where(eq(orders.id, payment.orderId)).limit(1)
        if (order && order.status === 'pending') {
          await tx.update(orders).set({
            status: 'confirmed',
            updatedAt: new Date(),
          }).where(eq(orders.id, order.id))
        }

        // Prepare post-commit system message (do not call chat inside tx)
        postMessage = {
          orderId: payment.orderId,
          msg: `✅ Paiement de ${Number(payment.amount).toLocaleString('fr-FR')} ${payment.currency} confirmé. Merci pour votre achat !`,
        }
      }

      return { status: 'processed', message: `Événement ${event.status} traité` }
    })

    // Send system message outside the DB transaction (best-effort)
    if (postMessage) {
      this.chat.postOrderSystemMessage(postMessage.orderId, postMessage.msg).catch((err: unknown) => {
        this.logger.error(`Échec envoi message système order=${postMessage?.orderId}: ${err instanceof Error ? err.message : String(err)}`)
      })
    }

    return result
  }
}
