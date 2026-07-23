import type { AdminReceiptDataSource, Receipt, ReceiptSettings, ReceiptQueryParams, PaginatedReceipts } from '../AdminReceiptDataSource'
import api from '@/lib/api'

function toReceipt(raw: any): Receipt {
  return { ...raw, amount: Number(raw.amount) }
}

export class ApiAdminReceiptDataSource implements AdminReceiptDataSource {
  async list(params?: ReceiptQueryParams): Promise<PaginatedReceipts> {
    const { data } = await api.get('/receipts', { params })
    return { ...data, data: data.data.map(toReceipt) }
  }

  async getById(id: string): Promise<Receipt> {
    const { data } = await api.get(`/receipts/${id}`)
    return toReceipt(data)
  }

  async create(orderId: string): Promise<Receipt> {
    const { data } = await api.post('/receipts', { orderId })
    return toReceipt(data)
  }

  async send(id: string): Promise<Receipt> {
    const { data } = await api.post(`/receipts/${id}/send`)
    return toReceipt(data)
  }

  async sendBulk(ids: string[]): Promise<number> {
    const { data } = await api.post('/receipts/bulk-send', { ids })
    return data.count ?? data
  }

  async getSettings(): Promise<ReceiptSettings> {
    const { data } = await api.get('/receipts/settings')
    return data
  }

  async updateSettings(input: Partial<ReceiptSettings>): Promise<ReceiptSettings> {
    const { data } = await api.put('/receipts/settings', input)
    return data
  }
}
