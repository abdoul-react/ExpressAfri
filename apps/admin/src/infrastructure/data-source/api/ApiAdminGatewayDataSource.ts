import api from '@/lib/api'

/** Clé attendue par une passerelle — déclarée par l'adaptateur côté API. */
export interface GatewayCredentialKey {
  key: string
  label: string
  secret: boolean
  hint?: string
}

export interface PaymentGateway {
  code: string
  label: string
  credentialKeys: GatewayCredentialKey[]
  /** Valeurs masquées (••••1234) — jamais les clés en clair. */
  credentials: Record<string, string>
  hasWebhookSecret: boolean
  isEnabled: boolean
  isSandbox: boolean
  apiEndpoint: string | null
  isConfigured: boolean
  supportsTest: boolean
  supportsRefund: boolean
  supportsStatusCheck: boolean
  routedMethods: { code: string; name: string }[]
}

export interface UpdateGatewayPayload {
  /** Champ vide = inchangé, null = effacé, valeur = remplacée. */
  credentials?: Record<string, string | null>
  webhookSecret?: string | null
  isEnabled?: boolean
  isSandbox?: boolean
  apiEndpoint?: string | null
}

export class ApiAdminGatewayDataSource {
  async list(): Promise<PaymentGateway[]> {
    const { data } = await api.get('/payment-gateways')
    return data
  }

  async update(code: string, payload: UpdateGatewayPayload): Promise<void> {
    await api.put(`/payment-gateways/${code}`, payload)
  }

  async test(code: string): Promise<{ ok: boolean; message?: string }> {
    const { data } = await api.post(`/payment-gateways/${code}/test`)
    return data
  }

  async routeMethod(methodCode: string, gatewayCode: string | null): Promise<void> {
    await api.put(`/payment-gateways/route/${methodCode}`, { gatewayCode })
  }
}

export const adminGatewayDataSource = new ApiAdminGatewayDataSource()
