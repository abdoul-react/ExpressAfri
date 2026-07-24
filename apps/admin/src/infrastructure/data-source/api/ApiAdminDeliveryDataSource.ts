import type { AdminDeliveryDataSource, DeliveryPerson, DeliveryAssignment, AvailableOrder, CreateDeliveryPersonInput, UpdateDeliveryPersonInput, DeliveryPersonQueryParams, PaginatedDeliveryPersons } from '../AdminDeliveryDataSource'
import api from '@/lib/api'

// Frontend uses hyphens ('picked-up', 'in-transit'); API/DB uses underscores
const TO_API_STATUS: Record<string, string> = {
  'picked-up': 'picked_up',
  'in-transit': 'in_transit',
}
const FROM_API_STATUS: Record<string, string> = {
  'picked_up': 'picked-up',
  'in_transit': 'in-transit',
}
function normalizeStatus(s: string): string {
  return TO_API_STATUS[s] ?? s
}
function fromApiStatus(s: string): string {
  return FROM_API_STATUS[s] ?? s
}

function toPerson(raw: any): DeliveryPerson {
  return {
    ...raw,
    country: { code: raw.countryCode ?? '', name: raw.countryName ?? '' },
    rating: Number(raw.rating ?? 0),
    ratingCount: Number(raw.ratingCount ?? 0),
    totalDeliveries: Number(raw.totalDeliveries ?? 0),
  }
}

function toApiPayload(input: { country?: { code: string; name: string }; [key: string]: any }) {
  const { country, ...rest } = input
  return {
    ...rest,
    ...(country ? { countryCode: country.code, countryName: country.name } : {}),
  }
}

function toAssignment(raw: any): DeliveryAssignment {
  return { ...raw, status: fromApiStatus(raw.status) as DeliveryAssignment['status'], rating: raw.rating != null ? Number(raw.rating) : undefined }
}

function toAvailableOrder(raw: any): AvailableOrder {
  return { ...raw, amount: Number(raw.amount) }
}

export class ApiAdminDeliveryDataSource implements AdminDeliveryDataSource {
  async listPersons(params?: DeliveryPersonQueryParams): Promise<PaginatedDeliveryPersons> {
    const { data } = await api.get('/delivery/persons', { params })
    return { ...data, data: data.data.map(toPerson) }
  }

  async getPersonById(id: string): Promise<DeliveryPerson> {
    const { data } = await api.get(`/delivery/persons/${id}`)
    return toPerson(data)
  }

  async createPerson(input: CreateDeliveryPersonInput): Promise<DeliveryPerson> {
    const { data } = await api.post('/delivery/persons', toApiPayload(input))
    return toPerson(data)
  }

  async updatePerson(id: string, input: UpdateDeliveryPersonInput): Promise<DeliveryPerson> {
    const { data } = await api.put(`/delivery/persons/${id}`, toApiPayload(input))
    return toPerson(data)
  }

  async deletePerson(id: string): Promise<void> {
    await api.delete(`/delivery/persons/${id}`)
  }

  async listAssignments(deliveryPersonId?: string): Promise<DeliveryAssignment[]> {
    const { data } = await api.get('/delivery/assignments', { params: { deliveryPersonId } })
    return (data.data ?? data).map(toAssignment)
  }

  async assignDelivery(deliveryPersonId: string, orderId: string): Promise<DeliveryAssignment> {
    const { data } = await api.post('/delivery/assignments', { deliveryPersonId, orderId })
    return toAssignment(data)
  }

  async updateAssignmentStatus(id: string, status: DeliveryAssignment['status'], notes?: string): Promise<DeliveryAssignment> {
    const { data } = await api.put(`/delivery/assignments/${id}/status`, {
      status: normalizeStatus(status),
      notes,
    })
    return toAssignment(data)
  }

  async rateAssignment(id: string, rating: number, notes?: string): Promise<{ assignment: DeliveryAssignment; person: DeliveryPerson }> {
    const { data } = await api.post(`/delivery/assignments/${id}/rate`, { rating, notes })
    return { assignment: toAssignment(data.assignment), person: toPerson(data.person) }
  }

  async listAvailableOrders(): Promise<AvailableOrder[]> {
    const { data } = await api.get('/delivery/available-orders')
    return (data.data ?? data).map(toAvailableOrder)
  }
}
