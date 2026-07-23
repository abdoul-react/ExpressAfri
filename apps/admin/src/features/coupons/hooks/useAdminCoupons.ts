import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCouponService } from '../services/adminCouponService'
import type { CreateCouponInput, UpdateCouponInput, CouponQueryParams } from '@/infrastructure/data-source/AdminCouponDataSource'

export function useAdminCoupons(params?: CouponQueryParams) {
  return useQuery({ queryKey: ['admin', 'coupons', params], queryFn: () => adminCouponService.list(params) })
}

export function useAdminCoupon(id: string) {
  return useQuery({ queryKey: ['admin', 'coupons', id], queryFn: () => adminCouponService.getById(id), enabled: !!id })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: CreateCouponInput) => adminCouponService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }) })
}

export function useUpdateCoupon(id: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: UpdateCouponInput) => adminCouponService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }); qc.invalidateQueries({ queryKey: ['admin', 'coupons', id] }) } })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => adminCouponService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }) })
}
