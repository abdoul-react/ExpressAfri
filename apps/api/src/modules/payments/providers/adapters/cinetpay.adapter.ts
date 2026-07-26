import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const PROD_URL = 'https://api-checkout.cinetpay.com/v2';

/** Correspondance méthode catalogue → canaux CinetPay. */
const CHANNELS: Record<string, string> = {
  orange_money: 'MOBILE_MONEY',
  moov_money: 'MOBILE_MONEY',
  mtn_momo: 'MOBILE_MONEY',
  wave: 'WALLET',
  card: 'CREDIT_CARD',
};

/**
 * CinetPay — agrégateur UEMOA (Orange Money, Moov, MTN, Wave, cartes) via
 * checkout hébergé : POST /payment renvoie une payment_url, le client paie
 * chez CinetPay, la notification serveur (notify_url) porte le verdict.
 * Signature webhook : HMAC-SHA256 du corps brut avec la clé secrète, header
 * `x-token`. Docs : https://docs.cinetpay.com
 */
export class CinetpayAdapter implements GatewayAdapter {
  readonly code = 'cinetpay';
  readonly label = 'CinetPay';
  readonly credentialKeys = [
    { key: 'apiKey', label: 'API Key', secret: true },
    { key: 'siteId', label: 'Site ID', secret: false },
    {
      key: 'secretKey',
      label: 'Secret Key (webhooks)',
      secret: true,
      hint: 'Clé HMAC des notifications, onglet Intégrations du back-office CinetPay',
    },
  ];

  private baseUrl(endpoint?: string | null): string {
    // CinetPay n'a pas d'URL sandbox distincte : le mode test se règle
    // côté compte marchand. L'override admin reste possible.
    return endpoint || PROD_URL;
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    const res = await fetch(`${this.baseUrl(input.apiEndpoint)}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: creds.apiKey,
        site_id: creds.siteId,
        transaction_id: input.paymentId,
        amount: Math.round(Number(input.amount)),
        currency: input.currency,
        description: `Commande ExpressAfri ${input.paymentId}`,
        channels: CHANNELS[input.method] ?? 'ALL',
        customer_phone_number: input.phoneNumber ?? '',
        return_url: input.returnUrl ?? '',
        notify_url: input.notifyUrl ?? '',
        lang: 'fr',
      }),
    });
    const body = (await res.json()) as any;
    if (body?.code !== '201' || !body?.data?.payment_url) {
      throw new Error(
        `CinetPay : ${body?.message ?? body?.description ?? `HTTP ${res.status}`}`,
      );
    }
    return {
      providerPaymentId: input.paymentId, // CinetPay référence NOTRE transaction_id
      checkoutUrl: body.data.payment_url,
      status: 'pending',
      raw: body,
    };
  }

  verifyWebhook(
    creds: GatewayCredentials,
    webhookSecret: string | null,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const token = String(headers['x-token'] ?? '');
    if (!token) return false;
    const secret = webhookSecret ?? creds.secretKey;
    if (!secret) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    // CinetPay poste cpm_trans_id (notre id) + cpm_result ('00' = succès)
    const trans = body.cpm_trans_id ?? body.transaction_id ?? '';
    const ok =
      body.cpm_result === '00' ||
      body.cpm_trans_status === 'ACCEPTED' ||
      body.status === 'ACCEPTED';
    return {
      eventId: `${trans}:${body.cpm_result ?? body.status ?? ''}:${body.cpm_payment_date ?? ''}`,
      providerPaymentId: String(trans),
      status: ok ? 'captured' : 'failed',
    };
  }

  async getStatus(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'> {
    const res = await fetch(`${this.baseUrl(ctx.apiEndpoint)}/payment/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: creds.apiKey,
        site_id: creds.siteId,
        transaction_id: providerPaymentId,
      }),
    });
    const body = (await res.json()) as any;
    const status = body?.data?.status;
    if (status === 'ACCEPTED') return 'captured';
    if (status === 'REFUSED') return 'failed';
    return 'pending';
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      // Vérification d'une transaction inexistante : une réponse structurée
      // (même négative) prouve que les identifiants sont acceptés.
      const res = await fetch(
        `${this.baseUrl(ctx.apiEndpoint)}/payment/check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apikey: creds.apiKey,
            site_id: creds.siteId,
            transaction_id: 'test-connection',
          }),
        },
      );
      const body = (await res.json()) as any;
      if (body?.code === '608' || body?.message === 'AUTH_NOT_FOUND') {
        return { ok: false, message: 'API Key ou Site ID invalide' };
      }
      return { ok: true, message: 'Identifiants CinetPay acceptés' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
