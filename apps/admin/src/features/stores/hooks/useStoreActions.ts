import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminStoreService } from '../services/adminStoreService'
import type { CreateStorePayload } from '@/infrastructure/data-source/AdminStoreDataSource'

export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateStorePayload) => adminStoreService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
    },
  })
}

export function useApproveStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminStoreService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] })
    },
  })
}

export function useRejectStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminStoreService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] })
    },
  })
}

export function useSuspendStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminStoreService.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] })
    },
  })
}

export function useReactivateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminStoreService.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] })
    },
  })
}

export function useUpdateKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: import('@/infrastructure/data-source/AdminStoreDataSource').UpdateKycPayload }) =>
      adminStoreService.updateKyc(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, docId, payload }: { storeId: string; docId: string; payload: import('@/infrastructure/data-source/AdminStoreDataSource').UpdateDocumentPayload }) =>
      adminStoreService.updateDocument(storeId, docId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] })
    },
  })
}

export function useUpdateCommission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: import('@/infrastructure/data-source/AdminStoreDataSource').UpdateCommissionPayload }) =>
      adminStoreService.updateCommission(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] })
    },
  })
}
