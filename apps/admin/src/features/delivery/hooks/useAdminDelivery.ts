import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminDeliveryService } from '../services/adminDeliveryService'
import type {
  CreateDeliveryPersonInput,
  UpdateDeliveryPersonInput,
  DeliveryPersonQueryParams,
  DeliveryAssignment,
} from '@/infrastructure/data-source/AdminDeliveryDataSource'

export function useAdminDeliveryPersons(params?: DeliveryPersonQueryParams) {
  return useQuery({
    queryKey: ['admin', 'delivery', 'persons', params],
    queryFn: () => adminDeliveryService.fetchDeliveryPersons(params),
  })
}

export function useAdminDeliveryPerson(id: string) {
  return useQuery({
    queryKey: ['admin', 'delivery', 'persons', id],
    queryFn: () => adminDeliveryService.fetchDeliveryPersonById(id),
    enabled: !!id,
  })
}

export function useCreateDeliveryPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDeliveryPersonInput) => adminDeliveryService.createDeliveryPerson(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'delivery', 'persons'] }),
  })
}

export function useUpdateDeliveryPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeliveryPersonInput }) =>
      adminDeliveryService.updateDeliveryPerson(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'delivery', 'persons'] }),
  })
}

export function useDeleteDeliveryPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminDeliveryService.deleteDeliveryPerson(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'delivery', 'persons'] }),
  })
}

export function useAdminAssignments(deliveryPersonId?: string) {
  return useQuery({
    queryKey: ['admin', 'delivery', 'assignments', deliveryPersonId],
    queryFn: () => adminDeliveryService.fetchAssignments(deliveryPersonId),
    enabled: deliveryPersonId !== undefined,
  })
}

export function useAssignDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveryPersonId, orderId }: { deliveryPersonId: string; orderId: string }) =>
      adminDeliveryService.assignDelivery(deliveryPersonId, orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'delivery', 'assignments'] }),
  })
}

export function useUpdateAssignmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: DeliveryAssignment['status']; notes?: string }) =>
      adminDeliveryService.updateAssignmentStatus(id, status, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'delivery', 'assignments'] }),
  })
}

/**
 * Soumet une note étoile pour une assignation.
 * Invalide à la fois les assignations ET la liste des livreurs
 * pour que le rating moyen se mette à jour immédiatement dans le tableau.
 */
export function useRateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rating, notes }: { id: string; rating: number; notes?: string }) =>
      adminDeliveryService.rateAssignment(id, rating, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'delivery', 'assignments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'delivery', 'persons'] })
    },
  })
}

export function useAvailableOrders() {
  return useQuery({
    queryKey: ['admin', 'delivery', 'available-orders'],
    queryFn: () => adminDeliveryService.fetchAvailableOrders(),
  })
}
