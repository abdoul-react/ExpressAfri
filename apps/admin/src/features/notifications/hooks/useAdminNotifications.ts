import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminNotificationService } from '../services/adminNotificationService'
import type { TemplateQueryParams, NotificationQueryParams } from '@/infrastructure/data-source/AdminNotificationDataSource'

export function useNotificationTemplates(params: TemplateQueryParams) {
  return useQuery({ queryKey: ['admin', 'notifications', 'templates', params], queryFn: () => adminNotificationService.listTemplates(params), placeholderData: (prev) => prev })
}

export function useNotificationTemplate(id: string) {
  return useQuery({ queryKey: ['admin', 'notifications', 'template', id], queryFn: () => adminNotificationService.getTemplate(id), enabled: !!id })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: any) => adminNotificationService.createTemplate(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'templates'] }) } })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminNotificationService.updateTemplate(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'notifications'] }) } })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => adminNotificationService.deleteTemplate(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'templates'] }) } })
}

export function useNotificationLogs(params: NotificationQueryParams) {
  return useQuery({ queryKey: ['admin', 'notifications', 'logs', params], queryFn: () => adminNotificationService.listLogs(params), placeholderData: (prev) => prev })
}

export function useSendTest() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ templateId, recipient }: { templateId: string; recipient: string }) => adminNotificationService.sendTest(templateId, recipient), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'logs'] }) } })
}

export function useSendBatch() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ templateId, recipients }: { templateId: string; recipients: string[] }) => adminNotificationService.sendBatch(templateId, recipients), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'logs'] }) } })
}
