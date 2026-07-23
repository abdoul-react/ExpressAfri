export interface DeliveryCountry {
  code: string
  name: string
}

export interface DeliveryPerson {
  id: string
  name: string
  phone: string
  email?: string
  vehicleType: 'bike' | 'car' | 'truck'
  country: DeliveryCountry
  region: string
  // Informations complémentaires
  address?: string        // Adresse domicile du livreur
  idCardNumber?: string   // Numéro pièce d'identité / permis
  licensePlate?: string   // Plaque d'immatriculation (car / truck)
  profilePhoto?: string   // URL photo de profil
  isActive: boolean
  isVerified: boolean
  rating: number          // Moyenne calculée dynamiquement
  ratingCount: number     // Nombre de notes enregistrées
  totalDeliveries: number
  joinedAt: string
}

export interface DeliveryAssignment {
  id: string
  deliveryPersonId: string
  deliveryPersonName: string
  orderId: string
  orderNumber: string
  customerName: string
  customerAddress: string
  status: 'assigned' | 'picked-up' | 'in-transit' | 'delivered' | 'failed'
  assignedAt: string
  pickedUpAt?: string
  deliveredAt?: string
  notes?: string
  rating?: number   // Note étoile 1-5 sur cette assignation spécifique
}

export interface CreateDeliveryPersonInput {
  name: string
  phone: string
  email?: string
  vehicleType: DeliveryPerson['vehicleType']
  country: DeliveryCountry
  region: string
  address?: string
  idCardNumber?: string
  licensePlate?: string
  profilePhoto?: string
}

export interface UpdateDeliveryPersonInput {
  name?: string
  phone?: string
  email?: string
  vehicleType?: DeliveryPerson['vehicleType']
  country?: DeliveryCountry
  region?: string
  address?: string
  idCardNumber?: string
  licensePlate?: string
  profilePhoto?: string
  isActive?: boolean
  isVerified?: boolean
}

export interface DeliveryPersonQueryParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  countryCode?: string
  region?: string
}

export interface PaginatedDeliveryPersons {
  data: DeliveryPerson[]
  total: number
  page: number
}

export interface AvailableOrder {
  id: string
  orderNumber: string
  customerName: string
  customerAddress: string
  amount: number
  currency: string
  createdAt: string
}

export interface AdminDeliveryDataSource {
  listPersons(params?: DeliveryPersonQueryParams): Promise<PaginatedDeliveryPersons>
  getPersonById(id: string): Promise<DeliveryPerson>
  createPerson(data: CreateDeliveryPersonInput): Promise<DeliveryPerson>
  updatePerson(id: string, data: UpdateDeliveryPersonInput): Promise<DeliveryPerson>
  deletePerson(id: string): Promise<void>
  listAssignments(deliveryPersonId?: string): Promise<DeliveryAssignment[]>
  assignDelivery(deliveryPersonId: string, orderId: string): Promise<DeliveryAssignment>
  updateAssignmentStatus(id: string, status: DeliveryAssignment['status'], notes?: string): Promise<DeliveryAssignment>
  rateAssignment(id: string, rating: number, notes?: string): Promise<{ assignment: DeliveryAssignment; person: DeliveryPerson }>
  listAvailableOrders(): Promise<AvailableOrder[]>
}
