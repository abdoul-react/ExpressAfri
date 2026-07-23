import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminShippingService } from '../services/adminShippingService'

export function useShippingZones() {
  return useQuery({ queryKey: ['admin', 'shipping', 'zones'], queryFn: () => adminShippingService.listZones() })
}

export function useShippingZone(id: string) {
  return useQuery({ queryKey: ['admin', 'shipping', 'zones', id], queryFn: () => adminShippingService.getZone(id), enabled: !!id })
}

export function useCreateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; countries: string[]; priority?: number }) => adminShippingService.createZone(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'zones'] }),
  })
}

export function useUpdateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminShippingService.updateZone(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'zones'] }),
  })
}

export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminShippingService.deleteZone(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'zones'] }); qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'methods'] }); qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'rules'] }) },
  })
}

export function useToggleZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminShippingService.toggleZone(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'zones'] }),
  })
}

export function useShippingMethods(zoneId?: string) {
  return useQuery({ queryKey: ['admin', 'shipping', 'methods', zoneId], queryFn: () => adminShippingService.listMethods(zoneId) })
}

export function useCreateMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => adminShippingService.createMethod(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'methods'] }),
  })
}

export function useUpdateMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminShippingService.updateMethod(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'methods'] }),
  })
}

export function useDeleteMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminShippingService.deleteMethod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'methods'] }),
  })
}

export function useShippingRules(zoneId?: string) {
  return useQuery({ queryKey: ['admin', 'shipping', 'rules', zoneId], queryFn: () => adminShippingService.listRules(zoneId) })
}

export function useCreateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => adminShippingService.createRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'rules'] }),
  })
}

export function useUpdateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminShippingService.updateRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'rules'] }),
  })
}

export function useDeleteRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminShippingService.deleteRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shipping', 'rules'] }),
  })
}
