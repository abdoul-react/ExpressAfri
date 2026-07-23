import type {
  AdminDeliveryDataSource,
  DeliveryPerson,
  DeliveryAssignment,
  AvailableOrder,
  CreateDeliveryPersonInput,
  UpdateDeliveryPersonInput,
  DeliveryPersonQueryParams,
  PaginatedDeliveryPersons,
} from '../AdminDeliveryDataSource'
import { MOCK_DELIVERY_PERSONS, MOCK_DELIVERY_ASSIGNMENTS } from './data/mockDelivery'

let personIdCounter = MOCK_DELIVERY_PERSONS.length + 1
let assignIdCounter = MOCK_DELIVERY_ASSIGNMENTS.length + 1

function pad(n: number) { return String(n).padStart(3, '0') }

/** Recalcule la note moyenne et le total de livraisons d'un livreur à partir de ses assignations. */
function recomputePersonStats(person: DeliveryPerson, assignments: DeliveryAssignment[]): DeliveryPerson {
  const myAssignments = assignments.filter((a) => a.deliveryPersonId === person.id)
  const delivered = myAssignments.filter((a) => a.status === 'delivered')
  const rated = delivered.filter((a) => a.rating !== undefined && a.rating > 0)

  const avgRating = rated.length > 0
    ? Math.round((rated.reduce((sum, a) => sum + (a.rating ?? 0), 0) / rated.length) * 10) / 10
    : person.rating // garder la valeur initiale si aucune note encore

  return {
    ...person,
    totalDeliveries: myAssignments.filter(
      (a) => a.status === 'delivered' || a.status === 'failed'
    ).length,
    rating: avgRating,
    ratingCount: rated.length,
  }
}

export class MockAdminDeliveryDataSource implements AdminDeliveryDataSource {
  private persons: DeliveryPerson[] = [...MOCK_DELIVERY_PERSONS]
  private assignments: DeliveryAssignment[] = [...MOCK_DELIVERY_ASSIGNMENTS]
  private availableOrders: AvailableOrder[] = [
    { id: 'ord_501', orderNumber: 'EX-2026-00501', customerName: 'Khadija Sy', customerAddress: 'Cocody, Riviera 3, Villa 45', amount: 28500, currency: 'XOF', createdAt: '2026-07-16T08:30:00Z' },
    { id: 'ord_502', orderNumber: 'EX-2026-00502', customerName: 'Moussa Coulibaly', customerAddress: 'Plateau, Rue du Commerce 12', amount: 54000, currency: 'XOF', createdAt: '2026-07-16T09:15:00Z' },
    { id: 'ord_503', orderNumber: 'EX-2026-00503', customerName: 'Aïcha Traoré', customerAddress: 'Yopougon, Selmer Bloc B', amount: 12800, currency: 'XOF', createdAt: '2026-07-16T10:00:00Z' },
    { id: 'ord_504', orderNumber: 'EX-2026-00504', customerName: 'Salif Koné', customerAddress: 'Marcory Zone 4, Résidence Palm', amount: 36200, currency: 'XOF', createdAt: '2026-07-16T10:45:00Z' },
    { id: 'ord_505', orderNumber: 'EX-2026-00505', customerName: 'Fatou Diallo', customerAddress: 'Adjamé, Quartier Liberté', amount: 9500, currency: 'XOF', createdAt: '2026-07-16T11:20:00Z' },
    { id: 'ord_506', orderNumber: 'EX-2026-00506', customerName: 'Ibrahim Bamba', customerAddress: 'Koumassi, Cité Verte', amount: 74000, currency: 'XOF', createdAt: '2026-07-16T12:00:00Z' },
    { id: 'ord_507', orderNumber: 'EX-2026-00507', customerName: 'Nana Ouattara', customerAddress: 'Treichville, Avenue 15', amount: 21000, currency: 'XOF', createdAt: '2026-07-16T13:10:00Z' },
    { id: 'ord_508', orderNumber: 'EX-2026-00508', customerName: 'Seydou Diabaté', customerAddress: 'Port-Bouët, Vridi Canal', amount: 16500, currency: 'XOF', createdAt: '2026-07-16T14:00:00Z' },
  ]
  private delay(ms = 300) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async listPersons(params?: DeliveryPersonQueryParams): Promise<PaginatedDeliveryPersons> {
    await this.delay()
    // Recalcul des stats avant d'afficher
    const refreshed = this.persons.map((p) => recomputePersonStats(p, this.assignments))

    let filtered = [...refreshed]

    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((x) =>
        x.name.toLowerCase().includes(s) ||
        x.phone.includes(s) ||
        x.region.toLowerCase().includes(s) ||
        x.country.name.toLowerCase().includes(s)
      )
    }
    if (params?.isActive !== undefined) {
      filtered = filtered.filter((x) => x.isActive === params.isActive)
    }
    if (params?.countryCode) {
      filtered = filtered.filter((x) => x.country.code === params.countryCode)
    }
    if (params?.region) {
      filtered = filtered.filter((x) => x.region.toLowerCase() === params.region!.toLowerCase())
    }

    const page = params?.page ?? 1
    const limit = params?.limit ?? 10
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length, page }
  }

  async getPersonById(id: string): Promise<DeliveryPerson> {
    await this.delay()
    const item = this.persons.find((x) => x.id === id)
    if (!item) throw new Error('Livreur introuvable')
    return recomputePersonStats(item, this.assignments)
  }

  async createPerson(data: CreateDeliveryPersonInput): Promise<DeliveryPerson> {
    await this.delay()
    const item: DeliveryPerson = {
      id: `del_${pad(personIdCounter++)}`,
      ...data,
      isActive: true,
      isVerified: false,
      rating: 0,
      ratingCount: 0,
      totalDeliveries: 0,
      joinedAt: new Date().toISOString(),
    }
    this.persons.push(item)
    return item
  }

  async updatePerson(id: string, data: UpdateDeliveryPersonInput): Promise<DeliveryPerson> {
    await this.delay()
    const idx = this.persons.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Livreur introuvable')
    this.persons[idx] = { ...this.persons[idx], ...data }
    return recomputePersonStats(this.persons[idx], this.assignments)
  }

  async deletePerson(id: string): Promise<void> {
    await this.delay()
    const idx = this.persons.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Livreur introuvable')
    this.persons.splice(idx, 1)
    this.assignments = this.assignments.filter((a) => a.deliveryPersonId !== id)
  }

  async listAssignments(deliveryPersonId?: string): Promise<DeliveryAssignment[]> {
    await this.delay()
    if (deliveryPersonId) return this.assignments.filter((a) => a.deliveryPersonId === deliveryPersonId)
    return [...this.assignments]
  }

  async assignDelivery(deliveryPersonId: string, orderId: string): Promise<DeliveryAssignment> {
    await this.delay()
    const person = this.persons.find((x) => x.id === deliveryPersonId)
    if (!person) throw new Error('Livreur introuvable')
    const existing = this.assignments.find((a) => a.orderId === orderId)
    if (existing) throw new Error('Cette commande a déjà une assignation')
    const item: DeliveryAssignment = {
      id: `ass_${pad(assignIdCounter++)}`,
      deliveryPersonId: person.id,
      deliveryPersonName: person.name,
      orderId,
      orderNumber: `EX-2026-${orderId.replace('ord_', '')}`,
      customerName: 'Client',
      customerAddress: '',
      status: 'assigned',
      assignedAt: new Date().toISOString(),
    }
    this.assignments.push(item)
    return item
  }

  async updateAssignmentStatus(id: string, status: DeliveryAssignment['status'], notes?: string): Promise<DeliveryAssignment> {
    await this.delay()
    const idx = this.assignments.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Assignation introuvable')
    const now = new Date().toISOString()
    this.assignments[idx] = {
      ...this.assignments[idx],
      status,
      notes: notes ?? this.assignments[idx].notes,
      pickedUpAt: status === 'picked-up' ? (this.assignments[idx].pickedUpAt ?? now) : this.assignments[idx].pickedUpAt,
      deliveredAt: (status === 'delivered' || status === 'failed') ? now : this.assignments[idx].deliveredAt,
    }
    return this.assignments[idx]
  }

  /**
   * Enregistre une note étoile (1-5) sur une assignation ET recalcule
   * automatiquement le rating moyen du livreur.
   */
  async rateAssignment(id: string, rating: number, notes?: string): Promise<{ assignment: DeliveryAssignment; person: DeliveryPerson }> {
    await this.delay()
    const idx = this.assignments.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Assignation introuvable')

    this.assignments[idx] = {
      ...this.assignments[idx],
      rating,
      notes: notes ?? this.assignments[idx].notes,
    }

    const assignment = this.assignments[idx]
    const personIdx = this.persons.findIndex((p) => p.id === assignment.deliveryPersonId)
    if (personIdx === -1) throw new Error('Livreur introuvable')

    const updatedPerson = recomputePersonStats(this.persons[personIdx], this.assignments)
    this.persons[personIdx] = updatedPerson

    return { assignment, person: updatedPerson }
  }

  /** Retourne les commandes en statut ready_for_shipping et non encore assignées. */
  async listAvailableOrders(): Promise<AvailableOrder[]> {
    await this.delay()
    const assignedOrderIds = new Set(this.assignments.map((a) => a.orderId))
    return this.availableOrders.filter((o) => !assignedOrderIds.has(o.id))
  }
}
