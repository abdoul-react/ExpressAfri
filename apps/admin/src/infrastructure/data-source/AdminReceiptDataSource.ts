export interface Receipt {
  id: string
  orderId: string
  storeId: string
  paymentId?: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  amount: number
  currency: string
  status: 'sent' | 'unsent' | 'failed'
  type: 'email' | 'sms' | 'print'
  sentAt?: string
  createdAt: string
  downloadUrl?: string
  fiscalYear?: number
  sequenceNumber?: number
}

export interface ReceiptSettings {
  autoSend: boolean
  defaultType: 'email' | 'sms'
  prefix: string
  footerText: string
  emailSubject: string
  emailTemplate: string
  brandName?: string
  logoUrl?: string
  showBarcode?: boolean
  accentColor?: string
}

export interface ReceiptQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export interface PaginatedReceipts {
  data: Receipt[]
  total: number
  page: number
}

export interface AdminReceiptDataSource {
  list(params?: ReceiptQueryParams): Promise<PaginatedReceipts>
  getById(id: string): Promise<Receipt>
  create(orderId: string): Promise<Receipt>
  send(id: string): Promise<Receipt>
  sendBulk(ids: string[]): Promise<number>
  getSettings(): Promise<ReceiptSettings>
  updateSettings(data: Partial<ReceiptSettings>): Promise<ReceiptSettings>
}
