import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, like, or, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { payments, refunds } from '../../database/schema/payments';
import { orders, orderStatusLog } from '../../database/schema/orders';
import { PaymentWebhookService } from './payment-webhook.service';
import { GatewayRegistryService } from './gateway-registry.service';
import { AuditService } from '../audit/audit.service';
import { AppLoggerService } from '../../common/logger/logger.service';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private webhookService: PaymentWebhookService,
    private registry: GatewayRegistryService,
    private audit: AuditService,
    private logger: AppLoggerService,
  ) {}

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    method?: string;
    orderId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (params.search)
      conditions.push(or(like(payments.transactionId, `%${params.search}%`)));
    if (params.status) conditions.push(eq(payments.status, params.status));
    if (params.method) conditions.push(eq(payments.method, params.method));
    if (params.orderId) conditions.push(eq(payments.orderId, params.orderId));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(payments)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(payments.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getById(id: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    if (!payment) throw new NotFoundException('Paiement introuvable');
    const refundList = await this.db
      .select()
      .from(refunds)
      .where(eq(refunds.paymentId, id));
    return { ...payment, refunds: refundList };
  }

  async create(data: {
    orderId: string;
    storeId: string;
    amount: string;
    method?: string;
    currency?: string;
    transactionId?: string;
    status?: string;
  }) {
    const [payment] = await this.db.insert(payments).values(data).returning();

    await this.audit.create({
      action: 'CREATE',
      resource: 'payments',
      resourceId: payment.id,
      details: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
      },
      status: 'success',
    });

    return payment;
  }

  async refund(id: string, data: { amount: number; reason?: string }) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    if (!payment) throw new NotFoundException('Paiement introuvable');

    const refundedAmount = data.amount ?? Number(payment.amount);
    const isFullRefund = refundedAmount >= Number(payment.amount);

    // Remboursement côté PSP quand l'adaptateur le permet — sinon l'admin
    // rembourse manuellement (mobile money direct) et on trace en base.
    let gatewayRefundId: string | null = null;
    if (payment.provider && payment.providerPaymentId) {
      try {
        const resolved = await this.registry.resolveGateway(payment.provider);
        if (resolved.adapter.refund) {
          const r = await resolved.adapter.refund(
            resolved.creds,
            payment.providerPaymentId,
            String(refundedAmount),
            {
              isSandbox: resolved.isSandbox,
              apiEndpoint: resolved.apiEndpoint,
            },
          );
          gatewayRefundId = r.refundId;
        }
      } catch (e) {
        // L'échec PSP n'empêche pas la trace comptable : l'admin verra que
        // gateway_refund_id est vide et traitera manuellement.
        this.logger.warn(
          `refund PSP ${payment.provider}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    const [refund] = await this.db
      .insert(refunds)
      .values({
        paymentId: id,
        orderId: payment.orderId,
        storeId: payment.storeId,
        amount: String(refundedAmount),
        reason: data.reason,
        gatewayRefundId,
      })
      .returning();

    await this.db
      .update(payments)
      .set({
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id));

    // Mettre à jour le statut de la commande associée
    if (payment.orderId) {
      const newOrderStatus = isFullRefund ? 'refunded' : 'partially_refunded';
      await this.db
        .update(orders)
        .set({ status: newOrderStatus, updatedAt: new Date() })
        .where(eq(orders.id, payment.orderId));
      await this.db.insert(orderStatusLog).values({
        orderId: payment.orderId,
        storeId: payment.storeId,
        fromStatus: 'delivered',
        toStatus: newOrderStatus,
        reason: data.reason ?? 'Remboursement',
      });
    }

    await this.audit.create({
      action: 'REFUND',
      resource: 'payments',
      resourceId: id,
      details: {
        refundId: refund.id,
        amount: refundedAmount,
        reason: data.reason,
        orderId: payment.orderId,
      },
      status: 'success',
    });

    return refund;
  }

  async initialize(orderId: string, method?: string, returnUrl?: string): Promise<{ status: string; paymentUrl?: string; message?: string }> {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);
    if (!payment)
      return { status: 'failed', message: 'Aucun paiement trouvé pour cette commande' };

    if (payment.status !== 'pending') {
      return { status: payment.status, message: `Paiement déjà initié (statut: ${payment.status})` };
    }

    // La passerelle est celle configurée par l'admin pour CETTE méthode du
    // catalogue (payment_methods.gateway_code) : agrégateur ou API directe.
    const effectiveMethod = method ?? payment.method;
    let resolved;
    try {
      resolved = await this.registry.resolveForMethod(effectiveMethod);
    } catch (e) {
      return {
        status: 'failed',
        message:
          e instanceof Error
            ? e.message
            : 'Aucune passerelle de paiement configurée',
      };
    }

    // URL de notification serveur : chaque passerelle poste sur SA route
    const apiBase = process.env.API_PUBLIC_URL ?? '';
    const notifyUrl = apiBase
      ? `${apiBase}/api/payments/webhooks/${resolved.adapter.code}`
      : undefined;

    let result;
    try {
      result = await resolved.adapter.initialize(resolved.creds, {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: effectiveMethod,
        phoneNumber:
          (payment.metadata as { payerPhoneNumber?: string } | null)
            ?.payerPhoneNumber ?? undefined,
        returnUrl,
        notifyUrl,
        isSandbox: resolved.isSandbox,
        apiEndpoint: resolved.apiEndpoint,
      });
    } catch (e) {
      // Erreur PSP (réseau, refus…) : le paiement reste pending, le client
      // peut réessayer — on ne crashe jamais le checkout.
      const msg = e instanceof Error ? e.message : 'Erreur passerelle';
      this.logger.error(`initialize ${resolved.adapter.code}: ${msg}`);
      return { status: 'failed', message: msg };
    }

    await this.db
      .update(payments)
      .set({
        provider: resolved.adapter.code,
        providerPaymentId: result.providerPaymentId,
        status: result.status,
        method: effectiveMethod,
        gatewayResponse: (result.raw ?? null) as any,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    await this.audit.create({
      action: 'INITIALIZE',
      resource: 'payments',
      resourceId: payment.id,
      details: { orderId, method: effectiveMethod, provider: resolved.adapter.code, providerPaymentId: result.providerPaymentId },
      status: 'success',
    });

    return {
      status: result.status,
      paymentUrl: result.checkoutUrl ?? undefined,
    };
  }

  /**
   * Statut du paiement d'une commande — appelé par le mobile après le retour
   * du navigateur PSP. Si le statut local est encore `pending` et que
   * l'adaptateur sait interroger le PSP (getStatus), on réconcilie
   * activement : indispensable pour MTN MoMo (pas de webhook fiable) et
   * utile quand le webhook est en retard.
   */
  async getOrderPaymentStatus(orderId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);
    if (!payment) throw new NotFoundException('Paiement introuvable');

    if (
      (payment.status === 'pending' || payment.status === 'authorized') &&
      payment.provider &&
      payment.providerPaymentId
    ) {
      try {
        const resolved = await this.registry.resolveGateway(payment.provider);
        if (resolved.adapter.getStatus) {
          const remote = await resolved.adapter.getStatus(
            resolved.creds,
            payment.providerPaymentId,
            {
              isSandbox: resolved.isSandbox,
              apiEndpoint: resolved.apiEndpoint,
            },
          );
          if (remote === 'captured') {
            await this.db
              .update(payments)
              .set({ status: 'captured', capturedAt: new Date(), updatedAt: new Date() })
              .where(eq(payments.id, payment.id));
            // Confirmer la commande comme le ferait le webhook
            await this.db
              .update(orders)
              .set({ status: 'confirmed', updatedAt: new Date() })
              .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
            payment.status = 'captured';
          } else if (remote === 'failed') {
            await this.db
              .update(payments)
              .set({ status: 'failed', updatedAt: new Date() })
              .where(eq(payments.id, payment.id));
            payment.status = 'failed';
          }
        }
      } catch (e) {
        // Réconciliation best-effort : on renvoie le statut local
        this.logger.warn(
          `getOrderPaymentStatus reconcile: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    return {
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
    };
  }

  async handleWebhook(
    gatewayCode: string,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const result = await this.webhookService.processWebhook(
      gatewayCode,
      rawBody,
      headers,
    );

    await this.audit.create({
      action: 'WEBHOOK',
      resource: 'payments',
      details: { provider: gatewayCode, status: result.status },
      status: 'success',
    });

    return result;
  }

  async getByOrderId(orderId: string) {
    return this.db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(payments.createdAt);
  }
}
