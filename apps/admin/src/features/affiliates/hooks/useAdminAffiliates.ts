import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAffiliateService } from '../services/adminAffiliateService'
import type { AffiliateQueryParams, CommissionQueryParams } from '@/infrastructure/data-source/AdminAffiliateDataSource'

export function useAdminAffiliates(params: AffiliateQueryParams) { return useQuery({ queryKey: ['admin', 'affiliates', params], queryFn: () => adminAffiliateService.list(params), placeholderData: (prev) => prev }) }
export function useAdminAffiliate(id: string) { return useQuery({ queryKey: ['admin', 'affiliate', id], queryFn: () => adminAffiliateService.getById(id), enabled: !!id }) }
export function useCreateAffiliate() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => adminAffiliateService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'affiliates'] }) } }) }
export function useUpdateAffiliate() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminAffiliateService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'affiliates'] }) } }) }
export function useUpdateAffiliateStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => adminAffiliateService.updateStatus(id, status), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'affiliates'] }) } }) }
export function useAffiliateCodes(affiliateId: string) { return useQuery({ queryKey: ['admin', 'affiliate', affiliateId, 'codes'], queryFn: () => adminAffiliateService.listCodes(affiliateId), enabled: !!affiliateId }) }
export function useCreateCode() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ affiliateId, data }: { affiliateId: string; data: any }) => adminAffiliateService.createCode(affiliateId, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'affiliate'] }) } }) }
export function useToggleCode() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminAffiliateService.toggleCode(id, isActive), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'affiliate'] }) } }) }
export function useAffiliateCommissions(params: CommissionQueryParams) { return useQuery({ queryKey: ['admin', 'commissions', params], queryFn: () => adminAffiliateService.listCommissions(params), placeholderData: (prev) => prev }) }
export function useApproveCommission() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => adminAffiliateService.approveCommission(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'commissions'] }) } }) }
export function useRejectCommission() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => adminAffiliateService.rejectCommission(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'commissions'] }) } }) }
export function useAffiliateSummary() { return useQuery({ queryKey: ['admin', 'affiliates', 'summary'], queryFn: () => adminAffiliateService.getSummary() }) }
