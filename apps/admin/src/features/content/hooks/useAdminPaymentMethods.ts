import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'
import type { CreatePaymentMethodInput, UpdatePaymentMethodInput } from '@/infrastructure/data-source/AdminContentDataSource'

export function useAdminPaymentMethods() {
  return useQuery({
    queryKey: ['admin', 'content', 'payment-methods'],
    queryFn: () => adminContentService.listPaymentMethods(),
  })
}

export function useAdminPaymentMethod(id: string) {
  return useQuery({
    queryKey: ['admin', 'content', 'payment-methods', id],
    queryFn: () => adminContentService.getPaymentMethod(id),
    enabled: !!id,
  })
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentMethodInput) => adminContentService.createPaymentMethod(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'payment-methods'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}

export function useUpdatePaymentMethod(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePaymentMethodInput) => adminContentService.updatePaymentMethod(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'payment-methods'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'payment-methods', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminContentService.deletePaymentMethod(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'payment-methods'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}

export function useUploadPaymentMethodLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminContentService.uploadPaymentMethodLogo(id, file),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'payment-methods'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'payment-methods', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}
