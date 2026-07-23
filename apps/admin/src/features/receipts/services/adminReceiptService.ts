import { adminReceiptDataSource } from '@/infrastructure/data-source'
import type { ReceiptQueryParams, ReceiptSettings } from '@/infrastructure/data-source/AdminReceiptDataSource'
import { toServiceError } from '@/lib/service-error'

export async function fetchReceipts(params: ReceiptQueryParams) {
  try {
    return await adminReceiptDataSource.list(params)
  } catch (err) {
    throw toServiceError(err, 'Liste des reçus')
  }
}

export async function createReceipt(orderId: string) {
  try {
    return await adminReceiptDataSource.create(orderId)
  } catch (err) {
    throw toServiceError(err, 'Création du reçu')
  }
}

export async function fetchReceiptById(id: string) {
  try {
    return await adminReceiptDataSource.getById(id)
  } catch (err) {
    throw toServiceError(err, 'Récupération du reçu')
  }
}

export async function sendReceipt(id: string) {
  try {
    return await adminReceiptDataSource.send(id)
  } catch (err) {
    throw toServiceError(err, 'Envoi du reçu')
  }
}

export async function sendBulkReceipts(ids: string[]) {
  try {
    return await adminReceiptDataSource.sendBulk(ids)
  } catch (err) {
    throw toServiceError(err, 'Envoi en lot des reçus')
  }
}

export async function fetchReceiptSettings() {
  try {
    return await adminReceiptDataSource.getSettings()
  } catch (err) {
    throw toServiceError(err, 'Récupération des paramètres de reçu')
  }
}

export async function updateReceiptSettings(data: Partial<ReceiptSettings>) {
  try {
    return await adminReceiptDataSource.updateSettings(data)
  } catch (err) {
    throw toServiceError(err, 'Mise à jour des paramètres de reçu')
  }
}
