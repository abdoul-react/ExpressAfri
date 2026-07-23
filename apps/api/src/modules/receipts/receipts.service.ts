import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { receipts, receiptSettings } from '../../database/schema/receipts'
import { orders, orderItems } from '../../database/schema/orders'
import { customers } from '../../database/schema/customers'
import { payments } from '../../database/schema/payments'
import { ChatService } from '../chat/chat.service'
import { receiptMessage } from '../../common/system-messages'
import PDFDocument from 'pdfkit'
import type { StorageService } from '../storage/storage.service'

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name)

  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject('STORAGE_SERVICE') private storage: StorageService,
    private chat: ChatService,
  ) {}

  /**
   * Génère un Buffer PDF détaillé à partir du snapshot immuable du reçu.
   */
  private async generatePdfBuffer(r: {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string | null
    customerPhone: string | null
    amount: string
    currency: string
    sentAt: Date | null
    createdAt: Date | null
    storeId?: string
    snapshot?: {
      items: { label: string; sku: string | null; quantity: number; unitPrice: string; totalPrice: string }[]
      subtotal: string
      shippingCost: string
      taxAmount: string
      discountAmount: string
      paymentMethod: string
      paymentStatus: string
    } | null
  }): Promise<Buffer> {
    let brand = { name: 'ExpressAfri', color: '#f97316', footer: 'Merci pour votre achat.', showBarcode: false }
    if (r.storeId) {
      const [s] = await this.db.select().from(receiptSettings).where(eq(receiptSettings.storeId, r.storeId)).limit(1)
      if (s) {
        brand = {
          name: s.brandName || 'ExpressAfri',
          color: (s.accentColor && /^#[0-9A-Fa-f]{6}$/.test(s.accentColor)) ? s.accentColor : '#f97316',
          footer: s.footerText || 'Merci pour votre achat.',
          showBarcode: s.showBarcode ?? false,
        }
      }
    }

    const date = (r.sentAt ?? r.createdAt ?? new Date()).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    const amount = new Intl.NumberFormat('fr-FR').format(Number(r.amount)) + ' ' + r.currency

    const buffers: Buffer[] = []
    const doc = new PDFDocument({ size: 'A5', margin: 40 })
    doc.on('data', (chunk: Buffer) => buffers.push(chunk))

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      // ── En-tête ──────────────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 80).fill(brand.color)
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
        .text(brand.name, 40, 20)
      doc.fontSize(11).font('Helvetica').text('Reçu de paiement', 40, 46)
      doc.fontSize(10).text(`N° ${r.orderNumber}`, 40, 62)

      // ── Corps ─────────────────────────────────────────────────────────────
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold')
        .text('Informations client', 40, 100)
      doc.font('Helvetica').fontSize(10).fillColor('#374151')
      doc.text(`Nom : ${r.customerName}`, 40, 118)
      if (r.customerEmail) doc.text(`Email : ${r.customerEmail}`, 40, 134)
      if (r.customerPhone) doc.text(`Téléphone : ${r.customerPhone}`, 40, r.customerEmail ? 150 : 134)

      // ── Détail des articles (depuis le snapshot) ──────────────────────────
      const snapshot = r.snapshot
      let detailY = r.customerPhone ? 178 : r.customerEmail ? 162 : 146

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827')
        .text('Détail de la commande', 40, detailY)
      detailY += 18
      doc.font('Helvetica').fontSize(10).fillColor('#374151')
      doc.text(`Référence : ${r.orderNumber}`, 40, detailY)
      detailY += 16
      doc.text(`Date : ${date}`, 40, detailY)
      detailY += 20

      if (snapshot?.items && snapshot.items.length > 0) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280')
        doc.text('Article', 40, detailY, { width: 140 })
        doc.text('Qté', 180, detailY, { width: 30, align: 'center' })
        doc.text('P.U.', 210, detailY, { width: 60, align: 'right' })
        doc.text('Total', 270, detailY, { width: 60, align: 'right' })
        detailY += 14

        doc.font('Helvetica').fontSize(9).fillColor('#374151')
        for (const item of snapshot.items) {
          const label = item.label.length > 32 ? item.label.slice(0, 30) + '…' : item.label
          const skuSuffix = item.sku ? ` (${item.sku})` : ''
          doc.text(label + skuSuffix, 40, detailY, { width: 140 })
          doc.text(String(item.quantity), 180, detailY, { width: 30, align: 'center' })
          const pu = new Intl.NumberFormat('fr-FR').format(Number(item.unitPrice))
          doc.text(pu, 210, detailY, { width: 60, align: 'right' })
          const total = new Intl.NumberFormat('fr-FR').format(Number(item.totalPrice))
          doc.text(total, 270, detailY, { width: 60, align: 'right' })
          detailY += 16
        }
        detailY += 4

        const fmt = (v: string) => new Intl.NumberFormat('fr-FR').format(Number(v))
        doc.fontSize(9).fillColor('#6b7280')
        const drawRow = (label: string, value: string, y: number) => {
          doc.font('Helvetica').text(label, 40, y, { width: 160 })
          doc.font('Helvetica-Bold').text(value, 270, y, { width: 60, align: 'right' })
        }
        drawRow('Sous-total', fmt(snapshot.subtotal) + ' ' + r.currency, detailY)
        detailY += 16
        if (Number(snapshot.shippingCost) > 0) {
          drawRow('Livraison', fmt(snapshot.shippingCost) + ' ' + r.currency, detailY)
          detailY += 16
        }
        if (Number(snapshot.discountAmount) > 0) {
          drawRow('Remise', '-' + fmt(snapshot.discountAmount) + ' ' + r.currency, detailY)
          detailY += 16
        }
        if (Number(snapshot.taxAmount) > 0) {
          drawRow('Taxe', fmt(snapshot.taxAmount) + ' ' + r.currency, detailY)
          detailY += 16
        }

        doc.fontSize(9).fillColor('#6b7280')
        doc.font('Helvetica').text('Moyen de paiement', 40, detailY, { width: 160 })
        doc.font('Helvetica-Bold').text(snapshot.paymentMethod, 270, detailY, { width: 60, align: 'right' })
        detailY += 16
        doc.font('Helvetica').text('Statut du paiement', 40, detailY, { width: 160 })
        doc.font('Helvetica-Bold').text(snapshot.paymentStatus === 'captured' ? 'Payé' : snapshot.paymentStatus, 270, detailY, { width: 60, align: 'right' })
        detailY += 16
      }

      // ── Total ─────────────────────────────────────────────────────────────
      detailY += 4
      doc.rect(40, detailY, doc.page.width - 80, 36).fill('#f9fafb')
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(12)
        .text('Total payé', 52, detailY + 10)
      doc.fillColor(brand.color).fontSize(16)
        .text(amount, 0, detailY + 8, { align: 'right', width: doc.page.width - 52 })

      let footerY = detailY + 60
      if (brand.showBarcode) {
        doc.font('Courier-Bold').fontSize(13).fillColor('#111827')
          .text(r.orderNumber, 40, footerY, { align: 'center', width: doc.page.width - 80, characterSpacing: 4 })
        footerY += 24
      }

      doc.fillColor('#9ca3af').font('Helvetica').fontSize(8)
        .text('Reçu émis le ' + date + ' — document non modifiable.', 40, footerY, { align: 'center', width: doc.page.width - 80 })
      footerY += 12

      doc.fillColor('#9ca3af').font('Helvetica').fontSize(9)
        .text(brand.footer, 40, footerY, { align: 'center', width: doc.page.width - 80 })
        .text('Ce reçu a été généré automatiquement.', 40, footerY + 14, { align: 'center', width: doc.page.width - 80 })

      doc.end()
    })
  }

  /** Langue préférée du client d'une commande (pour traduire le message de reçu). */
  private async customerLanguage(orderId: string): Promise<string | null> {
    const [order] = await this.db.select({ customerId: orders.customerId }).from(orders)
      .where(eq(orders.id, orderId)).limit(1)
    if (!order?.customerId) return null
    const [c] = await this.db.select({ language: customers.language }).from(customers)
      .where(eq(customers.id, order.customerId)).limit(1)
    return c?.language ?? null
  }

  async list(params: { page?: number; limit?: number; search?: string; status?: string; type?: string; storeId?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []
    if (params.search) conditions.push(or(like(receipts.orderNumber, `%${params.search}%`), like(receipts.customerName, `%${params.search}%`)))
    if (params.status) conditions.push(eq(receipts.status, params.status))
    if (params.type) conditions.push(eq(receipts.type, params.type))
    if (params.storeId) conditions.push(eq(receipts.storeId, params.storeId))

    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(receipts).where(where).limit(limit).offset(offset).orderBy(receipts.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(receipts).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [receipt] = await this.db.select().from(receipts).where(eq(receipts.id, id)).limit(1)
    if (!receipt) throw new NotFoundException('Reçu introuvable')
    return receipt
  }

  async create(data: { orderId: string; storeId: string }) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = UUID_RE.test(data.orderId)
    const where = isUuid ? eq(orders.id, data.orderId) : eq(orders.orderNumber, data.orderId)
    const [order] = await this.db.select().from(orders).where(where).limit(1)
    if (!order) throw new NotFoundException('Commande introuvable')

    return this.db.transaction(async (tx) => {
      // Idempotence dans la transaction : détecter un reçu existant créé
      // par une transaction concurrente
      const [existing] = await tx.select().from(receipts)
        .where(eq(receipts.orderId, order.id)).limit(1)
      if (existing) return existing

      // Verrouiller la ligne de paramètres pour le compteur atomique
      const [lockedSettings] = await tx.select().from(receiptSettings)
        .where(eq(receiptSettings.storeId, data.storeId))
        .for('update')
        .limit(1)

      const prefix = lockedSettings?.prefix ?? 'REC-'
      const fiscalYear = new Date().getFullYear()
      let nextNumber = lockedSettings?.nextNumber ?? 1

      // Incrémenter le compteur
      if (lockedSettings) {
        await tx.update(receiptSettings)
          .set({ nextNumber: nextNumber + 1, updatedAt: new Date() })
          .where(eq(receiptSettings.storeId, data.storeId))
      }

      // Construire le numéro séquentiel : REC-2026-000001
      const seqPadded = String(nextNumber).padStart(6, '0')
      const orderNumber = `${prefix}${fiscalYear}-${seqPadded}`

      // Capturer le snapshot immuable
      const orderItemsData = await tx.select({
        label: orderItems.label,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
      }).from(orderItems).where(eq(orderItems.orderId, order.id))

      const [payment] = await tx.select({
        id: payments.id,
        method: payments.method,
        status: payments.status,
      }).from(payments).where(eq(payments.orderId, order.id)).limit(1)

      const billAddr = order.billingAddress as { name?: string; email?: string; phone?: string } | null

      const snapshot = {
        items: orderItemsData,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost ?? '0',
        taxAmount: order.taxAmount ?? '0',
        discountAmount: order.discountAmount ?? '0',
        paymentMethod: payment?.method ?? 'unknown',
        paymentStatus: payment?.status ?? 'unknown',
      }

      const [receipt] = await tx.insert(receipts).values({
        orderId: order.id,
        storeId: data.storeId,
        paymentId: payment?.id ?? null,
        orderNumber,
        customerName: billAddr?.name ?? '',
        customerEmail: billAddr?.email,
        customerPhone: billAddr?.phone,
        amount: order.total,
        currency: order.currency,
        type: lockedSettings?.defaultType ?? 'email',
        fiscalYear,
        sequenceNumber: nextNumber,
        snapshot,
      }).returning()

      return receipt
    })
  }

  async send(id: string) {
    const [existing] = await this.db.select().from(receipts).where(eq(receipts.id, id)).limit(1)
    if (!existing) throw new NotFoundException('Reçu introuvable')

    let downloadUrl = existing.downloadUrl
    if (!downloadUrl) {
      const pdfBuffer = await this.generatePdfBuffer({
        ...existing,
        storeId: existing.storeId,
        snapshot: existing.snapshot as any,
      })
      const key = `receipts/${existing.storeId}/${existing.id}.pdf`
      downloadUrl = await this.storage.save(key, pdfBuffer, 'application/pdf')
    }

    const [receipt] = await this.db.update(receipts)
      .set({ status: 'sent', sentAt: new Date(), downloadUrl })
      .where(eq(receipts.id, id))
      .returning()

    const language = await this.customerLanguage(receipt.orderId)
    await this.chat.postOrderSystemMessage(
      receipt.orderId,
      receiptMessage(receipt, language),
      { attachmentUrl: downloadUrl, attachmentName: `Reçu-${receipt.orderNumber}.pdf`, type: 'pdf' },
    )
    return receipt
  }

  async sendBulk(ids: string[]) {
    if (!ids?.length) return { sent: 0 }
    const rows = await this.db.select().from(receipts).where(sql`${receipts.id} = ANY(${ids}::uuid[])`)
    for (const r of rows) {
      let downloadUrl = r.downloadUrl
      if (!downloadUrl) {
        const pdfBuffer = await this.generatePdfBuffer({
          ...r,
          storeId: r.storeId,
          snapshot: r.snapshot as any,
        })
        const key = `receipts/${r.storeId}/${r.id}.pdf`
        downloadUrl = await this.storage.save(key, pdfBuffer, 'application/pdf')
      }
      await this.db.update(receipts)
        .set({ status: 'sent', sentAt: new Date(), downloadUrl })
        .where(eq(receipts.id, r.id))
      const language = await this.customerLanguage(r.orderId)
      await this.chat.postOrderSystemMessage(
        r.orderId,
        receiptMessage(r, language),
        { attachmentUrl: downloadUrl, attachmentName: `Reçu-${r.orderNumber}.pdf`, type: 'pdf' },
      )
    }
    return { sent: rows.length }
  }

  async getOrderCustomerId(orderId: string): Promise<string | null> {
    const [order] = await this.db.select({ customerId: orders.customerId }).from(orders)
      .where(eq(orders.id, orderId)).limit(1)
    return order?.customerId ?? null
  }

  async getSettings(storeId: string) {
    const [settings] = await this.db.select().from(receiptSettings).where(eq(receiptSettings.storeId, storeId)).limit(1)
    return settings ?? null
  }

  async updateSettings(storeId: string, data: any) {
    const existing = await this.getSettings(storeId)
    if (existing) {
      const [settings] = await this.db.update(receiptSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(receiptSettings.storeId, storeId))
        .returning()
      return settings
    }
    const [settings] = await this.db.insert(receiptSettings)
      .values({ ...data, storeId })
      .returning()
    return settings
  }
}
