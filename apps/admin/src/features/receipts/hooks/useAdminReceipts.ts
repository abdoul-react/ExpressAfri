import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchReceipts, fetchReceiptById, createReceipt, sendReceipt, sendBulkReceipts, fetchReceiptSettings, updateReceiptSettings } from '../services/adminReceiptService'
import type { ReceiptQueryParams } from '@/infrastructure/data-source/AdminReceiptDataSource'
import type { ReceiptSettings } from '@/infrastructure/data-source/AdminReceiptDataSource'

export function useAdminReceipts(params: ReceiptQueryParams) {
  return useQuery({
    queryKey: ['admin', 'receipts', 'list', params],
    queryFn: () => fetchReceipts(params),
    placeholderData: (prev) => prev,
  })
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => createReceipt(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'receipts', 'list'] })
    },
  })
}

export function useAdminReceipt(id: string) {
  return useQuery({
    queryKey: ['admin', 'receipt', id],
    queryFn: () => fetchReceiptById(id),
    enabled: !!id,
  })
}

export function useSendReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sendReceipt(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'receipts', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'receipt', id] })
    },
  })
}

export function useSendBulkReceipts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => sendBulkReceipts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'receipts', 'list'] })
    },
  })
}

export function useAdminReceiptSettings() {
  return useQuery({
    queryKey: ['admin', 'receipts', 'settings'],
    queryFn: fetchReceiptSettings,
  })
}

export function useUpdateReceiptSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ReceiptSettings>) => updateReceiptSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'receipts', 'settings'] })
    },
  })
}
