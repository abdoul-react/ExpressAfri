import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { payments } from '../../database/schema/payments';
import { orders } from '../../database/schema/orders';
import { ChatService } from '../chat/chat.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { setLogContext } from '../../common/interceptors/request-id.interceptor';
import { GatewayRegistryService } from './gateway-registry.service';

/**
 * Traitement des webhooks PSP. La passerelle est résolue par le registre
 * (adaptateur + secrets déchiffrés) : signature vérifiée sur les octets
 * bruts, idempotence par eventId, transition du paiement et de la commande
 * dans une transaction verrouillée.
 */
@Injectable()
export class PaymentWebhookService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private chat: ChatService,
    private logger: AppLoggerService,
    private registry: GatewayRegistryService,
  ) {}

  async processWebhook(
    gatewayCode: string,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<{ status: string; message: string }> {
    let resolved;
    try {
      resolved = await this.registry.resolveGateway(gatewayCode);
    } catch (e) {
      return {
        status: 'error',
        message:
          e instanceof Error
            ? e.message
            : `Passerelle ${gatewayCode} indisponible`,
      };
    }
    const { adapter, creds, webhookSecret } = resolved;

    if (!adapter.verifyWebhook(creds, webhookSecret, rawBody, headers)) {
      return { status: 'error', message: 'Signature webhook invalide' };
    }

    let event;
    try {
      event = adapter.parseWebhook(rawBody);
    } catch {
      return { status: 'error', message: 'Corps de webhook illisible' };
    }

    setLogContext('paymentId', event.providerPaymentId);
    this.logger.debug(
      `Received webhook event for gateway=${gatewayCode} parsed=${JSON.stringify(event)}`,
    );

    // Prepare a holder to send a system message after the DB transaction commits
    let postMessage: { orderId: string; msg: string } | null = null;

    const result = await this.db.transaction(async (tx) => {
      // Verrouiller la ligne paiement
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.providerPaymentId, event.providerPaymentId))
        .limit(1)
        .for('update');

      if (!payment) {
        return { status: 'error', message: 'Paiement introuvable' };
      }

      // Vérifier idempotence événement
      if (event.eventId && payment.webhookEventId === event.eventId) {
        return { status: 'ignored', message: 'Événement déjà traité' };
      }

      // Vérifier montant/devise (le webhook peut renvoyer un montant différent
      // pour les refunds partiels — on vérifie uniquement pour les captures)
      if (event.status === 'captured' || event.status === 'authorized') {
        if (!payment.amount || !payment.currency) {
          return {
            status: 'error',
            message: 'Montant ou devise du paiement manquant',
          };
        }
      }

      // Mettre à jour le paiement
      const patch: Record<string, unknown> = {
        webhookEventId: event.eventId ?? payment.webhookEventId,
        updatedAt: new Date(),
      };

      if (event.status === 'captured') {
        patch.status = 'captured';
        patch.capturedAt = new Date();
      } else if (event.status === 'failed') {
        patch.status = 'failed';
      } else if (event.status === 'refunded') {
        patch.status = 'refunded';
      } else if (event.status === 'authorized') {
        patch.status = 'authorized';
      }

      await tx.update(payments).set(patch).where(eq(payments.id, payment.id));

      // Pour un paiement capturé, mettre à jour la commande associée
      if (event.status === 'captured') {
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, payment.orderId))
          .limit(1);
        if (order && order.status === 'pending') {
          await tx
            .update(orders)
            .set({
              status: 'confirmed',
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));
        }

        // Prepare post-commit system message (do not call chat inside tx)
        postMessage = {
          orderId: payment.orderId,
          msg: `✅ Paiement de ${Number(payment.amount).toLocaleString('fr-FR')} ${payment.currency} confirmé. Merci pour votre achat !`,
        };
      }

      return {
        status: 'processed',
        message: `Événement ${event.status} traité`,
      };
    });

    // Send system message outside the DB transaction (best-effort)
    if (postMessage) {
      const pm: { orderId: string; msg: string } = postMessage;
      setLogContext('orderId', pm.orderId);
      this.chat
        .postOrderSystemMessage(pm.orderId, pm.msg)
        .catch((err: unknown) => {
          this.logger.error(
            `Échec envoi message système order=${pm.orderId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    return result;
  }
}
