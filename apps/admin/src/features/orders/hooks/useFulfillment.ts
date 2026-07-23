import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminOrderService } from '../services/adminOrderService'
import type { ShipmentInput } from '@/infrastructure/data-source/AdminOrderDataSource'

export function useCreateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: ShipmentInput }) =>
      adminOrderService.createShipment(orderId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.orderId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments', variables.orderId] })
    },
  })
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, status, issueReason }: { orderId: string; itemId: string; status: string; issueReason?: string }) =>
      adminOrderService.updateItemStatus(orderId, itemId, status, issueReason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.orderId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments', variables.orderId] })
    },
  })
}

export function useListShipments(orderId: string) {
  return useQuery({
    queryKey: ['admin', 'shipments', orderId],
    queryFn: () => adminOrderService.listShipments(orderId),
    enabled: !!orderId,
  })
}
