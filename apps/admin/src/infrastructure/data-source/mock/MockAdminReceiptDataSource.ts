import type { AdminReceiptDataSource, Receipt, ReceiptQueryParams, PaginatedReceipts, ReceiptSettings } from '../AdminReceiptDataSource'
import { MOCK_RECEIPTS, MOCK_RECEIPT_SETTINGS } from './data/mockReceipts'

export class MockAdminReceiptDataSource implements AdminReceiptDataSource {
  private receipts: Receipt[] = [...MOCK_RECEIPTS]
  private settings: ReceiptSettings = { ...MOCK_RECEIPT_SETTINGS }

  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params?: ReceiptQueryParams): Promise<PaginatedReceipts> {
    await this.delay()
    const { page = 1, limit = 10, search, status } = params || {}

    let filtered = [...this.receipts]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.orderNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerEmail.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q),
      )
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status)
    }

    const total = filtered.length
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)

    return { data, total, page }
  }

  async create(orderId: string): Promise<Receipt> {
    await this.delay(500)
    const receipt: Receipt = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId,
      orderNumber: `REC-${orderId.slice(0, 8)}`,
      customerName: 'Client test',
      customerEmail: 'client@test.com',
      amount: 0,
      currency: 'XAF',
      status: 'unsent',
      type: 'email',
      createdAt: new Date().toISOString(),
    }
    this.receipts.unshift(receipt)
    return receipt
  }

  async getById(id: string): Promise<Receipt> {
    await this.delay()
    const receipt = this.receipts.find((r) => r.id === id)
    if (!receipt) throw new Error('Reçu introuvable')
    return receipt
  }

  async send(id: string): Promise<Receipt> {
    await this.delay(600)
    const index = this.receipts.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Reçu introuvable')
    this.receipts[index] = {
      ...this.receipts[index],
      status: 'sent',
      sentAt: new Date().toISOString(),
    }
    return this.receipts[index]
  }

  async sendBulk(ids: string[]): Promise<number> {
    await this.delay(800)
    let count = 0
    for (const id of ids) {
      const index = this.receipts.findIndex((r) => r.id === id)
      if (index !== -1 && this.receipts[index].status !== 'sent') {
        this.receipts[index] = {
          ...this.receipts[index],
          status: 'sent',
          sentAt: new Date().toISOString(),
        }
        count++
      }
    }
    return count
  }

  async getSettings(): Promise<ReceiptSettings> {
    await this.delay(300)
    return { ...this.settings }
  }

  async updateSettings(data: Partial<ReceiptSettings>): Promise<ReceiptSettings> {
    await this.delay(400)
    this.settings = { ...this.settings, ...data }
    return { ...this.settings }
  }
}
