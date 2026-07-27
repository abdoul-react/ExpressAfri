import api from '@/lib/api'

export interface SmsCredentialKey {
  key: string
  label: string
  secret: boolean
  hint?: string
}

export interface SmsGateway {
  code: string
  label: string
  credentialKeys: SmsCredentialKey[]
  /** Valeurs masquées (••••1234) — jamais les clés en clair. */
  credentials: Record<string, string>
  senderId: string | null
  apiEndpoint: string | null
  isEnabled: boolean
  isConfigured: boolean
  supportsTest: boolean
}

export interface UpdateSmsGatewayPayload {
  credentials?: Record<string, string | null>
  senderId?: string | null
  apiEndpoint?: string | null
  isEnabled?: boolean
}

export class ApiAdminSmsGatewayDataSource {
  async list(): Promise<SmsGateway[]> {
    const { data } = await api.get('/sms-gateways')
    return data
  }

  async update(code: string, payload: UpdateSmsGatewayPayload): Promise<void> {
    await api.put(`/sms-gateways/${code}`, payload)
  }

  async test(code: string): Promise<{ ok: boolean; message?: string }> {
    const { data } = await api.post(`/sms-gateways/${code}/test`)
    return data
  }
}

export const adminSmsGatewayDataSource = new ApiAdminSmsGatewayDataSource()
