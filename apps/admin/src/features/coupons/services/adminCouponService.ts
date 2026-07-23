import { adminCouponDataSource } from '@/infrastructure/data-source'
import type { CreateCouponInput, UpdateCouponInput, CouponQueryParams } from '@/infrastructure/data-source/AdminCouponDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminCouponService {
  async list(params?: CouponQueryParams) {
    try {
      return await adminCouponDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des coupons')
    }
  }
  async getById(id: string) {
    try {
      return await adminCouponDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du coupon')
    }
  }
  async create(data: CreateCouponInput) {
    try {
      return await adminCouponDataSource.create(data)
    } catch (err) {
      throw toServiceError(err, 'Création du coupon')
    }
  }
  async update(id: string, data: UpdateCouponInput) {
    try {
      return await adminCouponDataSource.update(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du coupon')
    }
  }
  async delete(id: string) {
    try {
      return await adminCouponDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du coupon')
    }
  }
}

export const adminCouponService = new AdminCouponService()
