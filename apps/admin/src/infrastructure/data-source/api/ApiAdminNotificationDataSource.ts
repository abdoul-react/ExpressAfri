import api from '../../../lib/api'
import type {
  AdminNotificationDataSource,
  NotificationTemplate,
  NotificationLog,
  TemplateQueryParams,
  NotificationQueryParams,
  PaginatedResult,
} from '../AdminNotificationDataSource'

export class ApiAdminNotificationDataSource implements AdminNotificationDataSource {
  async listTemplates(params: TemplateQueryParams): Promise<PaginatedResult<NotificationTemplate>> {
    const { data } = await api.get<PaginatedResult<NotificationTemplate>>('/notifications/templates', { params })
    return data
  }

  async getTemplate(id: string): Promise<NotificationTemplate> {
    const { data } = await api.get<NotificationTemplate>(`/notifications/templates/${id}`)
    return data
  }

  async createTemplate(input: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const { data } = await api.post<NotificationTemplate>('/notifications/templates', input)
    return data
  }

  async updateTemplate(id: string, input: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const { data } = await api.put<NotificationTemplate>(`/notifications/templates/${id}`, input)
    return data
  }

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/notifications/templates/${id}`)
  }

  async listLogs(params: NotificationQueryParams): Promise<PaginatedResult<NotificationLog>> {
    const { data } = await api.get<PaginatedResult<NotificationLog>>('/notifications/logs', { params })
    return data
  }

  async getLog(id: string): Promise<NotificationLog> {
    const { data } = await api.get<NotificationLog>(`/notifications/logs/${id}`)
    return data
  }

  async sendTest(templateId: string, recipient: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post<{ success: boolean; message: string }>('/notifications/send-test', { templateId, recipient })
    return data
  }

  async sendBatch(templateId: string, recipients: string[]): Promise<{ sent: number; failed: number }> {
    const { data } = await api.post<{ sent: number; failed: number }>('/notifications/send-batch', { templateId, recipients })
    return data
  }
}
