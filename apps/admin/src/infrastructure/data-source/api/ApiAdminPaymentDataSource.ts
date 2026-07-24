import type { AdminPaymentDataSource, PaymentQueryParams, PaginatedResult } from '../AdminPaymentDataSource'
import type { PaymentDTO } from '@/types/dto'
import api from '@/lib/api'

function toPayment(raw: Record<string, unknown>): PaymentDTO {
  return {
    id: raw.id as string,
    orderId: raw.orderId as string,
    orderNumber: raw.orderNumber as string | undefined,
    amount: Number(raw.amount),
    fees: raw.fees != null ? Number(raw.fees) : undefined,
    currency: (raw.currency ?? 'XOF') as string,
    status: raw.status as string,
    method: raw.method as string,
    methodLabel: raw.methodLabel as string | undefined,
    customerId: raw.customerId as string,
    customerName: raw.customerName as string | undefined,
    refundedAmount: raw.refundedAmount != null ? Number(raw.refundedAmount) : null,
    refundedAt: raw.refundedAt as string | undefined,
    transactionId: raw.transactionId as string | undefined,
    failedAt: raw.failedAt as string | undefined,
    paidAt: raw.paidAt as string | undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  }
}

export class ApiAdminPaymentDataSource implements AdminPaymentDataSource {
  async list(params: PaymentQueryParams): Promise<PaginatedResult<PaymentDTO>> {
    const { data } = await api.get('/payments', { params })
    return { ...data, data: (data.data as Record<string, unknown>[]).map(toPayment) }
  }

  async getById(id: string): Promise<PaymentDTO> {
    const { data } = await api.get(`/payments/${id}`)
    return toPayment(data as Record<string, unknown>)
  }

  async refund(id: string, amount?: number, reason?: string): Promise<PaymentDTO> {
    const { data } = await api.post(`/payments/${id}/refund`, { amount, reason })
    return toPayment(data as Record<string, unknown>)
  }
}
