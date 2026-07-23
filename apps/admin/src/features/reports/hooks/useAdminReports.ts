import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminReportService } from '../services/adminReportService'

export function useAdminReports(params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }) {
  return useQuery({ queryKey: ['admin', 'reports', params], queryFn: () => adminReportService.list(params) })
}

export function useAdminReport(id: string) {
  return useQuery({ queryKey: ['admin', 'reports', id], queryFn: () => adminReportService.getById(id), enabled: !!id })
}

export function useUpdateReportStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) =>
      adminReportService.updateStatus(id, status, resolution),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })
}
