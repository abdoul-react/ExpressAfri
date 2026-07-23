import { adminDeliveryDataSource } from '@/infrastructure/data-source'
import type {
  CreateDeliveryPersonInput,
  UpdateDeliveryPersonInput,
  DeliveryPersonQueryParams,
  DeliveryAssignment,
} from '@/infrastructure/data-source/AdminDeliveryDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminDeliveryService {
  async fetchDeliveryPersons(params?: DeliveryPersonQueryParams) {
    try {
      return await adminDeliveryDataSource.listPersons(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des livreurs')
    }
  }
  async fetchDeliveryPersonById(id: string) {
    try {
      return await adminDeliveryDataSource.getPersonById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du livreur')
    }
  }
  async createDeliveryPerson(data: CreateDeliveryPersonInput) {
    try {
      return await adminDeliveryDataSource.createPerson(data)
    } catch (err) {
      throw toServiceError(err, 'Création du livreur')
    }
  }
  async updateDeliveryPerson(id: string, data: UpdateDeliveryPersonInput) {
    try {
      return await adminDeliveryDataSource.updatePerson(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du livreur')
    }
  }
  async deleteDeliveryPerson(id: string) {
    try {
      return await adminDeliveryDataSource.deletePerson(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du livreur')
    }
  }
  async fetchAssignments(deliveryPersonId?: string): Promise<DeliveryAssignment[]> {
    try {
      return await adminDeliveryDataSource.listAssignments(deliveryPersonId)
    } catch (err) {
      throw toServiceError(err, 'Liste des assignations')
    }
  }
  async assignDelivery(deliveryPersonId: string, orderId: string) {
    try {
      return await adminDeliveryDataSource.assignDelivery(deliveryPersonId, orderId)
    } catch (err) {
      throw toServiceError(err, 'Assignation de la livraison')
    }
  }
  async updateAssignmentStatus(id: string, status: DeliveryAssignment['status'], notes?: string) {
    try {
      return await adminDeliveryDataSource.updateAssignmentStatus(id, status, notes)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du statut de l\'assignation')
    }
  }
  async rateAssignment(id: string, rating: number, notes?: string) {
    try {
      return await adminDeliveryDataSource.rateAssignment(id, rating, notes)
    } catch (err) {
      throw toServiceError(err, 'Évaluation de l\'assignation')
    }
  }
  async fetchAvailableOrders() {
    try {
      return await adminDeliveryDataSource.listAvailableOrders()
    } catch (err) {
      throw toServiceError(err, 'Liste des commandes disponibles')
    }
  }
}

export const adminDeliveryService = new AdminDeliveryService()
