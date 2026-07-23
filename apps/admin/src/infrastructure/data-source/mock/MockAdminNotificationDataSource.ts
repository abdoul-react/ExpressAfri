import type { AdminNotificationDataSource, NotificationTemplate, NotificationLog, TemplateQueryParams, NotificationQueryParams, PaginatedResult } from '../AdminNotificationDataSource'
import { MOCK_TEMPLATES, MOCK_NOTIFICATION_LOGS } from './data/mockNotifications'

export class MockAdminNotificationDataSource implements AdminNotificationDataSource {
  private templates = [...MOCK_TEMPLATES]
  private logs = [...MOCK_NOTIFICATION_LOGS]

  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async listTemplates(params: TemplateQueryParams): Promise<PaginatedResult<NotificationTemplate>> {
    await this.delay()
    const { page = 1, limit = 10, search, type, category } = params
    let filtered = [...this.templates]
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) }
    if (type) filtered = filtered.filter((t) => t.type === type)
    if (category) filtered = filtered.filter((t) => t.category === category)
    const total = filtered.length; const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total, page, limit, totalPages }
  }

  async getTemplate(id: string): Promise<NotificationTemplate> {
    await this.delay()
    const t = this.templates.find((t) => t.id === id)
    if (!t) throw new Error('Template introuvable')
    return t
  }

  async createTemplate(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    await this.delay(300)
    const id = `tmpl_${String(this.templates.length + 1).padStart(3, '0')}`
    const template: NotificationTemplate = {
      id,
      name: data.name ?? 'Nouveau template',
      type: data.type ?? 'email',
      category: data.category ?? 'order',
      subject: data.subject ?? '',
      body: data.body ?? '',
      variables: data.variables ?? [],
      isActive: data.isActive ?? true,
      lastEditedBy: data.lastEditedBy ?? 'admin@expressafri.com',
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    this.templates.push(template)
    return template
  }

  async updateTemplate(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    await this.delay(300)
    const index = this.templates.findIndex((t) => t.id === id)
    if (index === -1) throw new Error('Template introuvable')
    this.templates[index] = { ...this.templates[index], ...data, lastEditedAt: new Date().toISOString() }
    return this.templates[index]
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.delay(200)
    const index = this.templates.findIndex((t) => t.id === id)
    if (index === -1) throw new Error('Template introuvable')
    this.templates.splice(index, 1)
  }

  async listLogs(params: NotificationQueryParams): Promise<PaginatedResult<NotificationLog>> {
    await this.delay()
    const { page = 1, limit = 10, search, type, status, sortBy, sortOrder } = params
    let filtered = [...this.logs]
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter((l) => l.recipient.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q) || l.templateName.toLowerCase().includes(q)) }
    if (type) filtered = filtered.filter((l) => l.type === type)
    if (status) filtered = filtered.filter((l) => l.status === status)
    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortBy]; const bVal = (b as any)[sortBy]
        if (typeof aVal === 'string' && typeof bVal === 'string') return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
        return 0
      })
    }
    const total = filtered.length; const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total, page, limit, totalPages }
  }

  async getLog(id: string): Promise<NotificationLog> {
    await this.delay()
    const l = this.logs.find((l) => l.id === id)
    if (!l) throw new Error('Log introuvable')
    return l
  }

  async sendTest(templateId: string, recipient: string): Promise<{ success: boolean; message: string }> {
    await this.delay(800)
    const template = this.templates.find((t) => t.id === templateId)
    if (!template) throw new Error('Template introuvable')
    this.logs.unshift({
      id: `log_${Date.now()}`,
      templateId,
      templateName: template.name,
      type: template.type,
      recipient,
      subject: template.subject,
      status: 'sent',
      sentAt: new Date().toISOString(),
    })
    return { success: true, message: `Test envoyé à ${recipient}` }
  }

  async sendBatch(templateId: string, recipients: string[]): Promise<{ sent: number; failed: number }> {
    await this.delay(1000)
    const template = this.templates.find((t) => t.id === templateId)
    if (!template) throw new Error('Template introuvable')
    let sent = 0
    recipients.forEach((r) => {
      const success = Math.random() > 0.2
      this.logs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        templateId,
        templateName: template.name,
        type: template.type,
        recipient: r,
        subject: template.subject,
        status: success ? 'sent' : 'failed',
        sentAt: new Date().toISOString(),
        error: success ? undefined : 'Échec de livraison',
      })
      if (success) sent++
    })
    return { sent, failed: recipients.length - sent }
  }
}
