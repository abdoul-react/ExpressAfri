import { adminNotificationDataSource } from '@/infrastructure/data-source'
import type { TemplateQueryParams, NotificationQueryParams } from '@/infrastructure/data-source/AdminNotificationDataSource'
import { createNotificationTemplateSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminNotificationService {
  async listTemplates(params: TemplateQueryParams) {
    try {
      return await adminNotificationDataSource.listTemplates(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des templates')
    }
  }
  async getTemplate(id: string) {
    try {
      return await adminNotificationDataSource.getTemplate(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du template')
    }
  }

  async createTemplate(data: Record<string, unknown>) {
    try {
      const parsed = validateOrThrow(createNotificationTemplateSchema, data)
      return await adminNotificationDataSource.createTemplate(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création du template')
    }
  }

  async updateTemplate(id: string, data: Record<string, unknown>) {
    try {
      return await adminNotificationDataSource.updateTemplate(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du template')
    }
  }
  async deleteTemplate(id: string) {
    try {
      return await adminNotificationDataSource.deleteTemplate(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du template')
    }
  }
  async listLogs(params: NotificationQueryParams) {
    try {
      return await adminNotificationDataSource.listLogs(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des logs')
    }
  }
  async getLog(id: string) {
    try {
      return await adminNotificationDataSource.getLog(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du log')
    }
  }
  async sendTest(templateId: string, recipient: string) {
    try {
      return await adminNotificationDataSource.sendTest(templateId, recipient)
    } catch (err) {
      throw toServiceError(err, 'Envoi du test')
    }
  }
  async sendBatch(templateId: string, recipients: string[]) {
    try {
      return await adminNotificationDataSource.sendBatch(templateId, recipients)
    } catch (err) {
      throw toServiceError(err, 'Envoi en lot')
    }
  }
}

export const adminNotificationService = new AdminNotificationService()
