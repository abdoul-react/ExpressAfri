import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const PROD_URL = 'https://api.wave.com/v1';

/**
 * Wave (API directe, Sénégal/CI) via Checkout Sessions : POST
 * /checkout/sessions renvoie une wave_launch_url. Webhook signé
 * `Wave-Signature: t=…,v1=…` : HMAC-SHA256 de `t.corpsBrut` avec le
 * webhook secret. Docs : docs.wave.com
 */
export class WaveAdapter implements GatewayAdapter {
  readonly code = 'wave_direct';
  readonly label = 'Wave (direct)';
  readonly credentialKeys = [
    { key: 'apiKey', label: 'API Key (wave_sn_prod_…)', secret: true },
    {
      key: 'webhookSecret',
      label: 'Webhook secret',
      secret: true,
      hint: 'Business Portal → Developers → Webhooks',
    },
  ];

  private baseUrl(endpoint?: string | null): string {
    return endpoint || PROD_URL;
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    const res = await fetch(
      `${this.baseUrl(input.apiEndpoint)}/checkout/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creds.apiKey}`,
        },
        body: JSON.stringify({
          amount: String(Math.round(Number(input.amount))),
          currency: input.currency,
          client_reference: input.paymentId,
          success_url: input.returnUrl ?? 'https://expressafri.com/payment-return',
          error_url: input.returnUrl ?? 'https://expressafri.com/payment-return',
        }),
      },
    );
    const body = (await res.json()) as any;
    if (!body?.id || !body?.wave_launch_url) {
      throw new Error(
        `Wave : ${body?.message ?? body?.code ?? `HTTP ${res.status}`}`,
      );
    }
    return {
      providerPaymentId: String(body.id), // cos-…
      checkoutUrl: String(body.wave_launch_url),
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
    const header = String(headers['wave-signature'] ?? '');
    const secret = webhookSecret ?? creds.webhookSecret;
    if (!header || !secret) return false;
    const parts: Record<string, string[]> = {};
    for (const p of header.split(',')) {
      const [k, v] = p.trim().split('=');
      (parts[k] ??= []).push(v);
    }
    const t = parts['t']?.[0];
    const signatures = parts['v1'] ?? [];
    if (!t || !signatures.length) return false;
    const expected = createHmac('sha256', secret)
      .update(`${t}${rawBody.toString('utf8')}`)
      .digest('hex');
    const a = Buffer.from(expected);
    return signatures.some((s) => {
      const b = Buffer.from(s);
      return a.length === b.length && timingSafeEqual(a, b);
    });
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    const type = String(body?.type ?? '');
    const data = body?.data ?? {};
    const ok =
      type === 'checkout.session.completed' &&
      String(data.payment_status ?? '') === 'succeeded';
    return {
      eventId: String(body?.id ?? ''),
      providerPaymentId: String(data.id ?? ''),
      status: ok ? 'captured' : 'failed',
    };
  }

  async getStatus(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'> {
    const res = await fetch(
      `${this.baseUrl(ctx.apiEndpoint)}/checkout/sessions/${encodeURIComponent(providerPaymentId)}`,
      { headers: { Authorization: `Bearer ${creds.apiKey}` } },
    );
    const body = (await res.json()) as any;
    const status = String(body?.payment_status ?? '');
    if (status === 'succeeded') return 'captured';
    if (status === 'cancelled' || body?.checkout_status === 'expired')
      return 'failed';
    return 'pending';
  }

  async refund(
    creds: GatewayCredentials,
    providerPaymentId: string,
    _amount: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ refundId: string; status: 'pending' | 'done' }> {
    // Wave rembourse la session entière (pas de partiel via cette API)
    const res = await fetch(
      `${this.baseUrl(ctx.apiEndpoint)}/checkout/sessions/${encodeURIComponent(providerPaymentId)}/refund`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Wave refund : ${body?.message ?? `HTTP ${res.status}`}`);
    }
    return { refundId: providerPaymentId, status: 'pending' };
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl(ctx.apiEndpoint)}/balance`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (res.status === 401) {
        return { ok: false, message: 'API Key Wave invalide' };
      }
      return { ok: true, message: 'Identifiants Wave acceptés' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
