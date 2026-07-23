import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminLoyaltyService } from '../services/adminLoyaltyService'
import type { LoyaltyQueryParams } from '@/infrastructure/data-source/AdminLoyaltyDataSource'

export function useLoyaltySummary() { return useQuery({ queryKey: ['admin', 'loyalty', 'summary'], queryFn: () => adminLoyaltyService.getSummary() }) }
export function useLoyaltyRules() { return useQuery({ queryKey: ['admin', 'loyalty', 'rules'], queryFn: () => adminLoyaltyService.listRules() }) }
export function useCreateRule() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => adminLoyaltyService.createRule(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'loyalty', 'rules'] }) } }) }
export function useUpdateRule() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminLoyaltyService.updateRule(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'loyalty', 'rules'] }) } }) }
export function useDeleteRule() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => adminLoyaltyService.deleteRule(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'loyalty', 'rules'] }) } }) }
export function useLoyaltyRewards() { return useQuery({ queryKey: ['admin', 'loyalty', 'rewards'], queryFn: () => adminLoyaltyService.listRewards() }) }
export function useCreateReward() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => adminLoyaltyService.createReward(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'loyalty', 'rewards'] }) } }) }
export function useUpdateReward() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminLoyaltyService.updateReward(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'loyalty', 'rewards'] }) } }) }
export function useDeleteReward() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => adminLoyaltyService.deleteReward(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'loyalty', 'rewards'] }) } }) }
export function useLoyaltyCustomers(params: LoyaltyQueryParams) { return useQuery({ queryKey: ['admin', 'loyalty', 'customers', params], queryFn: () => adminLoyaltyService.listCustomers(params), placeholderData: (prev) => prev }) }
export function useCustomerPoints(customerId: string) { return useQuery({ queryKey: ['admin', 'loyalty', 'customer', customerId], queryFn: () => adminLoyaltyService.getCustomerPoints(customerId), enabled: !!customerId }) }
export function useAdjustPoints() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ customerId, points, reason }: { customerId: string; points: number; reason: string }) => adminLoyaltyService.adjustPoints(customerId, points, reason), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'loyalty'] }) } }) }
export function useCustomerTransactions(customerId: string) { return useQuery({ queryKey: ['admin', 'loyalty', 'transactions', customerId], queryFn: () => adminLoyaltyService.getTransactions(customerId), enabled: !!customerId }) }
