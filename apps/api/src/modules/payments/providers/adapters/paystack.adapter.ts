import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const PROD_URL = 'https://api.paystack.co';

/**
 * Paystack — agrégateur (Nigeria, Ghana, Côte d'Ivoire, Afrique du Sud…) via
 * transaction initialize : renvoie une authorization_url hébergée. Webhook
 * signé HMAC-SHA512 du corps brut avec la secret key, header
 * `x-paystack-signature`. Docs : https://paystack.com/docs
 */
export class PaystackAdapter implements GatewayAdapter {
  readonly code = 'paystack';
  readonly label = 'Paystack';
  readonly credentialKeys = [
    { key: 'secretKey', label: 'Secret Key (sk_…)', secret: true },
  ];

  private baseUrl(endpoint?: string | null): string {
    // Sandbox = clés de test (sk_test_…) sur la même URL
    return endpoint || PROD_URL;
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    const res = await fetch(
      `${this.baseUrl(input.apiEndpoint)}/transaction/initialize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creds.secretKey}`,
        },
        body: JSON.stringify({
          reference: input.paymentId,
          // Paystack attend la plus petite unité (kobo/pesewas) ; le XOF n'a
          // pas de subdivision → montant × 100 conformément à leur API.
          amount: Math.round(Number(input.amount) * 100),
          currency: input.currency,
          email: `client-${input.paymentId}@expressafri.com`,
          callback_url: input.returnUrl ?? undefined,
        }),
      },
    );
    const body = (await res.json()) as any;
    if (!body?.status || !body?.data?.authorization_url) {
      throw new Error(`Paystack : ${body?.message ?? `HTTP ${res.status}`}`);
    }
    return {
      providerPaymentId: input.paymentId, // reference = notre id
      checkoutUrl: body.data.authorization_url,
      status: 'pending',
      raw: body,
    };
  }

  verifyWebhook(
    creds: GatewayCredentials,
    _webhookSecret: string | null,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const signature = String(headers['x-paystack-signature'] ?? '');
    if (!signature || !creds.secretKey) return false;
    const expected = createHmac('sha512', creds.secretKey)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    const data = body?.data ?? {};
    const event = String(body?.event ?? '');
    return {
      eventId: `${event}:${data.id ?? data.reference ?? ''}`,
      providerPaymentId: String(data.reference ?? ''),
      status: event === 'charge.success' ? 'captured' : 'failed',
    };
  }

  async getStatus(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'> {
    const res = await fetch(
      `${this.baseUrl(ctx.apiEndpoint)}/transaction/verify/${encodeURIComponent(providerPaymentId)}`,
      { headers: { Authorization: `Bearer ${creds.secretKey}` } },
    );
    const body = (await res.json()) as any;
    const status = String(body?.data?.status ?? '');
    if (status === 'success') return 'captured';
    if (status === 'failed' || status === 'abandoned') return 'failed';
    return 'pending';
  }

  async refund(
    creds: GatewayCredentials,
    providerPaymentId: string,
    amount: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ refundId: string; status: 'pending' | 'done' }> {
    const res = await fetch(`${this.baseUrl(ctx.apiEndpoint)}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.secretKey}`,
      },
      body: JSON.stringify({
        transaction: providerPaymentId,
        amount: Math.round(Number(amount) * 100),
      }),
    });
    const body = (await res.json()) as any;
    if (!body?.status) {
      throw new Error(`Paystack refund : ${body?.message ?? `HTTP ${res.status}`}`);
    }
    return { refundId: String(body?.data?.id ?? ''), status: 'pending' };
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(
        `${this.baseUrl(ctx.apiEndpoint)}/transaction?perPage=1`,
        { headers: { Authorization: `Bearer ${creds.secretKey}` } },
      );
      if (res.status === 401) {
        return { ok: false, message: 'Secret Key Paystack invalide' };
      }
      return { ok: true, message: 'Identifiants Paystack acceptés' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
