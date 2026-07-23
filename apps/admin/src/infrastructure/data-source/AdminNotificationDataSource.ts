export type NotificationType = 'email' | 'push' | 'sms'
export type NotificationCategory = 'order' | 'payment' | 'delivery' | 'account' | 'promotion' | 'system'
export type NotificationLogStatus = 'sent' | 'delivered' | 'failed' | 'opened'

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  category: NotificationCategory
  subject: string
  body: string
  variables: string[]
  isActive: boolean
  lastEditedBy: string
  lastEditedAt: string
  createdAt: string
}

export interface NotificationLog {
  id: string
  templateId: string
  templateName: string
  type: NotificationType
  recipient: string
  subject: string
  status: NotificationLogStatus
  sentAt: string
  openedAt?: string
  error?: string
}

export interface NotificationQueryParams {
  page?: number
  limit?: number
  search?: string
  type?: NotificationType
  category?: NotificationCategory
  status?: NotificationLogStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TemplateQueryParams {
  page?: number
  limit?: number
  search?: string
  type?: NotificationType
  category?: NotificationCategory
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminNotificationDataSource {
  listTemplates(params: TemplateQueryParams): Promise<PaginatedResult<NotificationTemplate>>
  getTemplate(id: string): Promise<NotificationTemplate>
  createTemplate(data: Partial<NotificationTemplate>): Promise<NotificationTemplate>
  updateTemplate(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate>
  deleteTemplate(id: string): Promise<void>

  listLogs(params: NotificationQueryParams): Promise<PaginatedResult<NotificationLog>>
  getLog(id: string): Promise<NotificationLog>

  sendTest(templateId: string, recipient: string): Promise<{ success: boolean; message: string }>
  sendBatch(templateId: string, recipients: string[]): Promise<{ sent: number; failed: number }>
}
