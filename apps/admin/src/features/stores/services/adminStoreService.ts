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
  StoreMedia,
  StoreMediaType,
  StoreSection,
  StoreSectionItem,
  CreateSectionPayload,
  UpdateSectionPayload,
  StoreGroup,
  StoreGroupItem,
  CreateStoreGroupPayload,
  UpdateStoreGroupPayload,
  PaymentProvider,
  StorePaymentMethod,
  CreateStorePaymentMethodPayload,
  UpdateStorePaymentMethodPayload,
  PaymentMethodValidation,
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

  async listMedia(storeId: string): Promise<StoreMedia[]> {
    try {
      return await adminStoreDataSource.listMedia(storeId)
    } catch (err) {
      throw toServiceError(err, 'Liste des médias de la boutique')
    }
  }

  async uploadMedia(storeId: string, file: File, type: StoreMediaType, alt?: string): Promise<StoreMedia> {
    try {
      return await adminStoreDataSource.uploadMedia(storeId, file, type, alt)
    } catch (err) {
      throw toServiceError(err, 'Envoi du média')
    }
  }

  async reorderMedia(storeId: string, ids: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.reorderMedia(storeId, ids)
    } catch (err) {
      throw toServiceError(err, 'Réordonnancement de la galerie')
    }
  }

  async deleteMedia(storeId: string, mediaId: string): Promise<void> {
    try {
      return await adminStoreDataSource.deleteMedia(storeId, mediaId)
    } catch (err) {
      throw toServiceError(err, 'Suppression du média')
    }
  }

  async listSections(storeId: string): Promise<StoreSection[]> {
    try {
      return await adminStoreDataSource.listSections(storeId)
    } catch (err) {
      throw toServiceError(err, 'Liste des sections')
    }
  }

  async createSection(storeId: string, payload: CreateSectionPayload): Promise<StoreSection> {
    try {
      return await adminStoreDataSource.createSection(storeId, payload)
    } catch (err) {
      throw toServiceError(err, 'Création de la section')
    }
  }

  async updateSection(storeId: string, sectionId: string, payload: UpdateSectionPayload): Promise<StoreSection> {
    try {
      return await adminStoreDataSource.updateSection(storeId, sectionId, payload)
    } catch (err) {
      throw toServiceError(err, 'Modification de la section')
    }
  }

  async deleteSection(storeId: string, sectionId: string): Promise<void> {
    try {
      return await adminStoreDataSource.deleteSection(storeId, sectionId)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la section')
    }
  }

  async reorderSections(storeId: string, ids: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.reorderSections(storeId, ids)
    } catch (err) {
      throw toServiceError(err, 'Réordonnancement des sections')
    }
  }

  async listSectionItems(storeId: string, sectionId: string): Promise<StoreSectionItem[]> {
    try {
      return await adminStoreDataSource.listSectionItems(storeId, sectionId)
    } catch (err) {
      throw toServiceError(err, 'Produits de la section')
    }
  }

  async addSectionItems(storeId: string, sectionId: string, productIds: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.addSectionItems(storeId, sectionId, productIds)
    } catch (err) {
      throw toServiceError(err, 'Ajout de produits à la section')
    }
  }

  async removeSectionItem(storeId: string, sectionId: string, itemId: string): Promise<void> {
    try {
      return await adminStoreDataSource.removeSectionItem(storeId, sectionId, itemId)
    } catch (err) {
      throw toServiceError(err, 'Retrait du produit de la section')
    }
  }

  async reorderSectionItems(storeId: string, sectionId: string, ids: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.reorderSectionItems(storeId, sectionId, ids)
    } catch (err) {
      throw toServiceError(err, 'Réordonnancement des produits de la section')
    }
  }

  // ─── Sections de la liste des boutiques (vitrine) ───────────────────────────

  async listStoreGroups(): Promise<StoreGroup[]> {
    try {
      return await adminStoreDataSource.listStoreGroups()
    } catch (err) {
      throw toServiceError(err, 'Sections de la vitrine')
    }
  }

  async createStoreGroup(payload: CreateStoreGroupPayload): Promise<StoreGroup> {
    try {
      return await adminStoreDataSource.createStoreGroup(payload)
    } catch (err) {
      throw toServiceError(err, 'Création de la section de vitrine')
    }
  }

  async updateStoreGroup(groupId: string, payload: UpdateStoreGroupPayload): Promise<StoreGroup> {
    try {
      return await adminStoreDataSource.updateStoreGroup(groupId, payload)
    } catch (err) {
      throw toServiceError(err, 'Modification de la section de vitrine')
    }
  }

  async deleteStoreGroup(groupId: string): Promise<void> {
    try {
      return await adminStoreDataSource.deleteStoreGroup(groupId)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la section de vitrine')
    }
  }

  async reorderStoreGroups(ids: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.reorderStoreGroups(ids)
    } catch (err) {
      throw toServiceError(err, 'Réordonnancement des sections de vitrine')
    }
  }

  async listStoreGroupItems(groupId: string): Promise<StoreGroupItem[]> {
    try {
      return await adminStoreDataSource.listStoreGroupItems(groupId)
    } catch (err) {
      throw toServiceError(err, 'Boutiques de la section')
    }
  }

  async addStoreGroupItems(groupId: string, storeIds: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.addStoreGroupItems(groupId, storeIds)
    } catch (err) {
      throw toServiceError(err, 'Ajout de boutiques à la section')
    }
  }

  async removeStoreGroupItem(groupId: string, itemId: string): Promise<void> {
    try {
      return await adminStoreDataSource.removeStoreGroupItem(groupId, itemId)
    } catch (err) {
      throw toServiceError(err, 'Retrait de la boutique de la section')
    }
  }

  async reorderStoreGroupItems(groupId: string, ids: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.reorderStoreGroupItems(groupId, ids)
    } catch (err) {
      throw toServiceError(err, 'Réordonnancement des boutiques de la section')
    }
  }

  async listPaymentProviders(storeId: string): Promise<PaymentProvider[]> {
    try {
      return await adminStoreDataSource.listPaymentProviders(storeId)
    } catch (err) {
      throw toServiceError(err, 'Catalogue des providers de paiement')
    }
  }

  async listPaymentMethods(storeId: string): Promise<StorePaymentMethod[]> {
    try {
      return await adminStoreDataSource.listPaymentMethods(storeId)
    } catch (err) {
      throw toServiceError(err, 'Moyens de paiement de la boutique')
    }
  }

  async createPaymentMethod(
    storeId: string,
    payload: CreateStorePaymentMethodPayload,
  ): Promise<StorePaymentMethod> {
    try {
      return await adminStoreDataSource.createPaymentMethod(storeId, payload)
    } catch (err) {
      throw toServiceError(err, 'Activation du moyen de paiement')
    }
  }

  async updatePaymentMethod(
    storeId: string,
    methodId: string,
    payload: UpdateStorePaymentMethodPayload,
  ): Promise<StorePaymentMethod> {
    try {
      return await adminStoreDataSource.updatePaymentMethod(storeId, methodId, payload)
    } catch (err) {
      throw toServiceError(err, 'Modification du moyen de paiement')
    }
  }

  async deletePaymentMethod(storeId: string, methodId: string): Promise<void> {
    try {
      return await adminStoreDataSource.deletePaymentMethod(storeId, methodId)
    } catch (err) {
      throw toServiceError(err, 'Suppression du moyen de paiement')
    }
  }

  async reorderPaymentMethods(storeId: string, ids: string[]): Promise<void> {
    try {
      return await adminStoreDataSource.reorderPaymentMethods(storeId, ids)
    } catch (err) {
      throw toServiceError(err, 'Réordonnancement des moyens de paiement')
    }
  }

  async validatePaymentMethod(
    storeId: string,
    methodId: string,
  ): Promise<PaymentMethodValidation> {
    try {
      return await adminStoreDataSource.validatePaymentMethod(storeId, methodId)
    } catch (err) {
      throw toServiceError(err, 'Vérification du moyen de paiement')
    }
  }
}

export const adminStoreService = new AdminStoreService()
