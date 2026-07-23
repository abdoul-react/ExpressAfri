import type {
  AdminDisputeDataSource,
  AdminDispute,
  DisputeQueryParams,
  UpdateDisputeStatusPayload,
  ResolveDisputePayload,
  AddDisputeMessagePayload,
} from '../AdminDisputeDataSource'
import type { PaginatedResult } from '../AdminOrderDataSource'
import { MOCK_DISPUTES } from './data/mockDisputes'

export class MockAdminDisputeDataSource implements AdminDisputeDataSource {
  private disputes: AdminDispute[] = MOCK_DISPUTES.map((d) => ({ ...d }))

  private delay(ms = 500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params: DisputeQueryParams): Promise<PaginatedResult<AdminDispute>> {
    await this.delay()

    let results = [...this.disputes]

    // Recherche textuelle
    if (params.search) {
      const q = params.search.toLowerCase()
      results = results.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.orderRef.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.customerEmail.toLowerCase().includes(q) ||
          d.sellerName.toLowerCase().includes(q) ||
          d.storeName.toLowerCase().includes(q) ||
          d.productName.toLowerCase().includes(q),
      )
    }

    // Filtre statut
    if (params.status) {
      results = results.filter((d) => d.status === params.status)
    }

    // Filtre motif
    if (params.reason) {
      results = results.filter((d) => d.reason === params.reason)
    }

    // Filtre date de début
    if (params.fromDate) {
      results = results.filter((d) => d.createdAt >= params.fromDate!)
    }

    // Filtre date de fin
    if (params.toDate) {
      const toEnd = params.toDate + 'T23:59:59Z'
      results = results.filter((d) => d.createdAt <= toEnd)
    }

    // Tri
    const sortBy = params.sortBy ?? 'createdAt'
    const sortOrder = params.sortOrder ?? 'desc'
    results.sort((a, b) => {
      const av = (a as any)[sortBy] ?? ''
      const bv = (b as any)[sortBy] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })

    // Pagination
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const total = results.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const data = results.slice(start, start + limit)

    return { data, total, page, limit, totalPages }
  }

  async getById(id: string): Promise<AdminDispute> {
    await this.delay(300)
    const dispute = this.disputes.find((d) => d.id === id)
    if (!dispute) throw new Error(`Litige ${id} introuvable`)
    return { ...dispute }
  }

  async updateStatus(id: string, payload: UpdateDisputeStatusPayload): Promise<AdminDispute> {
    await this.delay(500)
    const idx = this.disputes.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Litige ${id} introuvable`)

    const now = new Date().toISOString()
    const dispute = { ...this.disputes[idx] }

    // Ajouter à la timeline
    dispute.timeline = [
      ...dispute.timeline,
      {
        id: `tl_${id}_${Date.now()}`,
        disputeId: id,
        status: payload.status,
        note: payload.note,
        actorId: 'admin_1',
        actorName: 'Admin',
        actorRole: 'admin' as const,
        createdAt: now,
      },
    ]

    dispute.status = payload.status
    dispute.updatedAt = now

    this.disputes[idx] = dispute
    return { ...dispute }
  }

  async resolve(id: string, payload: ResolveDisputePayload): Promise<AdminDispute> {
    await this.delay(600)
    const idx = this.disputes.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Litige ${id} introuvable`)

    const now = new Date().toISOString()
    const dispute = { ...this.disputes[idx] }

    const newStatus = payload.resolution === 'no_action' ? 'rejected' : 'resolved'

    dispute.status = newStatus as AdminDispute['status']
    dispute.resolution = payload.resolution
    dispute.resolutionAmount = payload.resolutionAmount
    dispute.resolutionNote = payload.resolutionNote
    dispute.updatedAt = now

    dispute.timeline = [
      ...dispute.timeline,
      {
        id: `tl_${id}_${Date.now()}`,
        disputeId: id,
        status: newStatus as AdminDispute['status'],
        note: payload.resolutionNote,
        actorId: 'admin_1',
        actorName: 'Admin',
        actorRole: 'admin' as const,
        createdAt: now,
      },
    ]

    this.disputes[idx] = dispute
    return { ...dispute }
  }

  async addMessage(id: string, payload: AddDisputeMessagePayload): Promise<AdminDispute> {
    await this.delay(400)
    const idx = this.disputes.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Litige ${id} introuvable`)

    const now = new Date().toISOString()
    const dispute = { ...this.disputes[idx] }

    const newMessage = {
      id: `msg_${id}_${Date.now()}`,
      disputeId: id,
      authorId: 'admin_1',
      authorName: 'Admin',
      authorRole: 'admin' as const,
      content: payload.content,
      attachments: payload.attachments?.map((a, i) => ({ ...a, id: `att_${Date.now()}_${i}` })),
      createdAt: now,
    }

    dispute.messages = [...dispute.messages, newMessage]
    dispute.updatedAt = now

    this.disputes[idx] = dispute
    return { ...dispute }
  }

  async assignToAdmin(id: string, adminId: string, adminName: string): Promise<AdminDispute> {
    await this.delay(300)
    const idx = this.disputes.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Litige ${id} introuvable`)

    const dispute = { ...this.disputes[idx] }
    dispute.assignedAdminId = adminId
    dispute.assignedAdminName = adminName
    dispute.updatedAt = new Date().toISOString()

    this.disputes[idx] = dispute
    return { ...dispute }
  }

  async delete(id: string): Promise<void> {
    await this.delay(400)
    const idx = this.disputes.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Litige ${id} introuvable`)
    this.disputes.splice(idx, 1)
  }
}
