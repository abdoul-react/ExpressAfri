import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { payments, refunds } from '../../database/schema/payments'
import { orders } from '../../database/schema/orders'
import { PaymentWebhookService } from './payment-webhook.service'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private webhookService: PaymentWebhookService,
    private audit: AuditService,
  ) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string; method?: string; orderId?: string }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const conditions = []
    if (params.search) conditions.push(or(like(payments.transactionId, `%${params.search}%`)))
    if (params.status) conditions.push(eq(payments.status, params.status))
    if (params.method) conditions.push(eq(payments.method, params.method))
    if (params.orderId) conditions.push(eq(payments.orderId, params.orderId))
    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(payments).where(where).limit(limit).offset(offset).orderBy(payments.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(payments).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1)
    if (!payment) throw new NotFoundException('Paiement introuvable')
    const refundList = await this.db.select().from(refunds).where(eq(refunds.paymentId, id))
    return { ...payment, refunds: refundList }
  }

  async create(data: {
    orderId: string
    storeId: string
    amount: string
    method?: string
    currency?: string
    transactionId?: string
    status?: string
  }) {
    const [payment] = await this.db.insert(payments).values(data).returning()

    await this.audit.create({
      action: 'CREATE',
      resource: 'payments',
      resourceId: payment.id,
      details: { orderId: data.orderId, amount: data.amount, method: data.method },
      status: 'success',
    })

    return payment
  }

  async refund(id: string, data: { amount: number; reason?: string }) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1)
    if (!payment) throw new NotFoundException('Paiement introuvable')
    const [refund] = await this.db.insert(refunds).values({ paymentId: id, orderId: payment.orderId, storeId: payment.storeId, amount: String(data.amount), reason: data.reason }).returning()
    await this.db.update(payments).set({ status: 'refunded', updatedAt: new Date() }).where(eq(payments.id, id))

    await this.audit.create({
      action: 'REFUND',
      resource: 'payments',
      resourceId: id,
      details: { refundId: refund.id, amount: data.amount, reason: data.reason, orderId: payment.orderId },
      status: 'success',
    })

    return refund
  }

  async initialize(orderId: string, method?: string, returnUrl?: string) {
    const [payment] = await this.db.select().from(payments)
      .where(eq(payments.orderId, orderId)).limit(1)
    if (!payment) throw new NotFoundException('Aucun paiement trouvé pour cette commande')

    if (payment.status !== 'pending') {
      throw new BadRequestException(`Paiement déjà initié (statut: ${payment.status})`)
    }

    const provider = this.webhookService.getProvider('mock')
    if (!provider) throw new BadRequestException('Aucun provider de paiement configuré')

    const result = await provider.initialize({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      method: method ?? payment.method,
      returnUrl,
    })

    await this.db.update(payments).set({
      provider: provider.name,
      providerPaymentId: result.providerPaymentId,
      status: result.status,
      method: method ?? payment.method,
      updatedAt: new Date(),
    }).where(eq(payments.id, payment.id))

    const [updated] = await this.db.select().from(payments).where(eq(payments.id, payment.id)).limit(1)

    await this.audit.create({
      action: 'INITIALIZE',
      resource: 'payments',
      resourceId: payment.id,
      details: { orderId, method, provider: provider.name, providerPaymentId: result.providerPaymentId },
      status: 'success',
    })

    return {
      payment: updated,
      checkoutUrl: result.checkoutUrl ?? null,
    }
  }

  async handleWebhook(providerName: string, rawBody: Buffer, signature: string) {
    const result = await this.webhookService.processWebhook(providerName, rawBody, signature)

    await this.audit.create({
      action: 'WEBHOOK',
      resource: 'payments',
      details: { provider: providerName, status: result.status },
      status: 'success',
    })

    return result
  }

  async getByOrderId(orderId: string) {
    return this.db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(payments.createdAt)
  }
}
