import { adminStoreDataSource } from '@/infrastructure/data-source'
import type {
  StoreQueryParams,
  UpdateKycPayload,
  UpdateDocumentPayload,
  UpdateCommissionPayload,
  UpdateStorePayload,
  StoreManager,
  CreateManagerPayload,
  SetManagerActivePayload,
  ResetManagerPasswordPayload,
  CreateStorePayload,
} from '@/infrastructure/data-source/AdminStoreDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminStoreService {
  async create(payload: CreateStorePayload) {
    try {
      return await adminStoreDataSource.create(payload)
    } catch (err) {
      throw toServiceError(err, 'Création de la boutique')
    }
  }

  async list(params: StoreQueryParams) {
    try {
      return await adminStoreDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des boutiques')
    }
  }
  async getById(id: string) {
    try {
      return await adminStoreDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la boutique')
    }
  }
  async update(id: string, payload: UpdateStorePayload) {
    try {
      return await adminStoreDataSource.update(id, payload)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la boutique')
    }
  }

  async delete(id: string) {
    try {
      return await adminStoreDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la boutique')
    }
  }

  async approve(id: string) {
    try {
      return await adminStoreDataSource.approve(id)
    } catch (err) {
      throw toServiceError(err, 'Approbation de la boutique')
    }
  }
  async reject(id: string, reason?: string) {
    try {
      return await adminStoreDataSource.reject(id, reason)
    } catch (err) {
      throw toServiceError(err, 'Rejet de la boutique')
    }
  }
  async suspend(id: string, reason?: string) {
    try {
      return await adminStoreDataSource.suspend(id, reason)
    } catch (err) {
      throw toServiceError(err, 'Suspension de la boutique')
    }
  }
  async reactivate(id: string) {
    try {
      return await adminStoreDataSource.reactivate(id)
    } catch (err) {
      throw toServiceError(err, 'Réactivation de la boutique')
    }
  }
  async updateKyc(id: string, payload: UpdateKycPayload) {
    try {
      return await adminStoreDataSource.updateKyc(id, payload)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du KYC')
    }
  }
  async updateDocument(storeId: string, docId: string, payload: UpdateDocumentPayload) {
    try {
      return await adminStoreDataSource.updateDocument(storeId, docId, payload)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du document')
    }
  }
  async updateCommission(id: string, payload: UpdateCommissionPayload) {
    try {
      return await adminStoreDataSource.updateCommission(id, payload)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la commission')
    }
  }

  async listManagers(storeId: string): Promise<StoreManager[]> {
    try {
      return await adminStoreDataSource.listManagers(storeId)
    } catch (err) {
      throw toServiceError(err, 'Liste des gestionnaires')
    }
  }

  async createManager(storeId: string, payload: CreateManagerPayload): Promise<StoreManager> {
    try {
      return await adminStoreDataSource.createManager(storeId, payload)
    } catch (err) {
      throw toServiceError(err, 'Création du gestionnaire')
    }
  }

  async setManagerActive(storeId: string, managerId: string, payload: SetManagerActivePayload): Promise<StoreManager> {
    try {
      return await adminStoreDataSource.setManagerActive(storeId, managerId, payload)
    } catch (err) {
      throw toServiceError(err, 'Activation/désactivation du gestionnaire')
    }
  }

  async resetManagerPassword(storeId: string, managerId: string, payload: ResetManagerPasswordPayload): Promise<StoreManager> {
    try {
      return await adminStoreDataSource.resetManagerPassword(storeId, managerId, payload)
    } catch (err) {
      throw toServiceError(err, 'Réinitialisation du mot de passe du gestionnaire')
    }
  }
}

export const adminStoreService = new AdminStoreService()
