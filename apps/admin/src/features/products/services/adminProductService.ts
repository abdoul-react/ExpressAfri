import { adminProductDataSource } from '@/infrastructure/data-source'
import type { ProductQueryParams, CreateProductInput, UpdateProductInput } from '@/infrastructure/data-source/AdminProductDataSource'
import { createProductSchema, updateProductSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminProductService {
  async list(params: ProductQueryParams) {
    try {
      return await adminProductDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des produits')
    }
  }

  async getById(id: string) {
    try {
      return await adminProductDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du produit')
    }
  }

  async create(data: CreateProductInput) {
    try {
      const parsed = validateOrThrow(createProductSchema, data)
      return await adminProductDataSource.create(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création du produit')
    }
  }

  async update(id: string, data: UpdateProductInput) {
    try {
      const parsed = validateOrThrow(updateProductSchema, data)
      return await adminProductDataSource.update(id, parsed)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du produit')
    }
  }

  async delete(id: string) {
    try {
      return await adminProductDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du produit')
    }
  }

  async export(params: ProductQueryParams) {
    try {
      return await adminProductDataSource.export(params)
    } catch (err) {
      throw toServiceError(err, 'Export des produits')
    }
  }

  async moderateApprove(id: string) {
    try {
      return await adminProductDataSource.moderateApprove(id)
    } catch (err) {
      throw toServiceError(err, 'Approbation du produit')
    }
  }

  async moderateReject(id: string, reason?: string) {
    try {
      return await adminProductDataSource.moderateReject(id, reason || 'Produit non conforme')
    } catch (err) {
      throw toServiceError(err, 'Rejet du produit')
    }
  }
}

export const adminProductService = new AdminProductService()
