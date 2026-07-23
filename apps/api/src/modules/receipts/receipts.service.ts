import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { receipts, receiptSettings } from '../../database/schema/receipts'
import { orders } from '../../database/schema/orders'
import { customers } from '../../database/schema/customers'
import { ChatService } from '../chat/chat.service'
import { receiptMessage } from '../../common/system-messages'
import { join } from 'path'
import { mkdirSync } from 'fs'
import PDFDocument from 'pdfkit'
import { createWriteStream } from 'fs'

@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private chat: ChatService,
  ) {}

  /**
   * Génère un PDF pour le reçu et le sauvegarde dans uploads/receipts/.
   * Retourne le chemin relatif (ex. /uploads/receipts/<id>.pdf) utilisable
   * comme downloadUrl et comme attachmentUrl dans le chat.
   */
  private async generatePdf(r: {
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
  }): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'receipts')
    mkdirSync(dir, { recursive: true })
    const filename = `${r.id}.pdf`
    const filepath = join(dir, filename)
    const relativePath = `/uploads/receipts/${filename}`

    // Charger le branding configuré par l'admin (nom, couleur, code-barres,
    // pied de page). Valeurs par défaut si aucun paramètre enregistré.
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

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 40 })
      const stream = createWriteStream(filepath)
      doc.pipe(stream)
      stream.on('finish', resolve)
      stream.on('error', reject)

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

      const detailY = r.customerPhone ? 178 : r.customerEmail ? 162 : 146
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827')
        .text('Détail de la commande', 40, detailY)
      doc.font('Helvetica').fontSize(10).fillColor('#374151')
      doc.text(`Référence : ${r.orderNumber}`, 40, detailY + 18)
      doc.text(`Date : ${date}`, 40, detailY + 34)

      // ── Total ─────────────────────────────────────────────────────────────
      const totalY = detailY + 70
      doc.rect(40, totalY, doc.page.width - 80, 36).fill('#f9fafb')
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(12)
        .text('Total payé', 52, totalY + 10)
      doc.fillColor(brand.color).fontSize(16)
        .text(amount, 0, totalY + 8, { align: 'right', width: doc.page.width - 52 })

      // ── Code-barres (optionnel) ───────────────────────────────────────────
      let footerY = totalY + 60
      if (brand.showBarcode) {
        doc.font('Courier-Bold').fontSize(13).fillColor('#111827')
          .text(r.orderNumber, 40, footerY, { align: 'center', width: doc.page.width - 80, characterSpacing: 4 })
        footerY += 24
      }

      // ── Pied de page ──────────────────────────────────────────────────────
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(9)
        .text(brand.footer, 40, footerY, { align: 'center', width: doc.page.width - 80 })
        .text('Ce reçu a été généré automatiquement.', 40, footerY + 14, { align: 'center', width: doc.page.width - 80 })

      doc.end()
    })

    return relativePath
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

    const billAddr = order.billingAddress as { name?: string; email?: string; phone?: string } | null

    const [settings] = await this.db.select().from(receiptSettings).where(eq(receiptSettings.storeId, data.storeId)).limit(1)

    const prefix = settings?.prefix ?? 'REC-'
    const [receipt] = await this.db.insert(receipts).values({
      orderId: order.id,
      storeId: data.storeId,
      orderNumber: `${prefix}${order.orderNumber}`,
      customerName: billAddr?.name ?? '',
      customerEmail: billAddr?.email,
      customerPhone: billAddr?.phone,
      amount: order.total,
      currency: order.currency,
      type: settings?.defaultType ?? 'email',
    }).returning()
    return receipt
  }

  async send(id: string) {
    const [existing] = await this.db.select().from(receipts).where(eq(receipts.id, id)).limit(1)
    if (!existing) throw new NotFoundException('Reçu introuvable')

    // Générer le PDF (ou réutiliser s'il existe déjà)
    const downloadUrl = existing.downloadUrl ?? await this.generatePdf(existing)

    const [receipt] = await this.db.update(receipts)
      .set({ status: 'sent', sentAt: new Date(), downloadUrl })
      .where(eq(receipts.id, id))
      .returning()

    // Livraison dans la boîte de réception du client : texte + PDF en pièce jointe
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
      const downloadUrl = r.downloadUrl ?? await this.generatePdf(r)
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
