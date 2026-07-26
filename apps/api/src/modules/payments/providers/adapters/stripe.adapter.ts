import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const PROD_URL = 'https://api.stripe.com/v1';

/**
 * Stripe — cartes internationales (Visa, Mastercard, Amex…) via Checkout
 * Sessions hébergées. Webhook signé `stripe-signature: t=…,v1=…` :
 * HMAC-SHA256 de `t.corpsBrut` avec le webhook secret (whsec_…).
 * Docs : https://stripe.com/docs/api
 */
export class StripeAdapter implements GatewayAdapter {
  readonly code = 'stripe';
  readonly label = 'Stripe';
  readonly credentialKeys = [
    { key: 'secretKey', label: 'Secret Key (sk_…)', secret: true },
    {
      key: 'webhookSecret',
      label: 'Webhook signing secret (whsec_…)',
      secret: true,
      hint: 'Developers → Webhooks → Signing secret dans le dashboard Stripe',
    },
  ];

  private baseUrl(endpoint?: string | null): string {
    return endpoint || PROD_URL;
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    // Stripe attend du form-urlencoded, montants en plus petite unité.
    // Le XOF est une devise « zero-decimal » chez Stripe : montant tel quel.
    const zeroDecimal = ['XOF', 'XAF', 'GNF', 'RWF', 'UGX', 'MGA'].includes(
      input.currency.toUpperCase(),
    );
    const unitAmount = zeroDecimal
      ? Math.round(Number(input.amount))
      : Math.round(Number(input.amount) * 100);
    const params = new URLSearchParams({
      mode: 'payment',
      client_reference_id: input.paymentId,
      success_url: input.returnUrl ?? 'https://expressafri.com/payment-return',
      cancel_url: input.returnUrl ?? 'https://expressafri.com/payment-return',
      'line_items[0][price_data][currency]': input.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(unitAmount),
      'line_items[0][price_data][product_data][name]': `Commande ExpressAfri`,
      'line_items[0][quantity]': '1',
      'metadata[paymentId]': input.paymentId,
    });
    const res = await fetch(`${this.baseUrl(input.apiEndpoint)}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${creds.secretKey}`,
      },
      body: params.toString(),
    });
    const body = (await res.json()) as any;
    if (!body?.id || !body?.url) {
      throw new Error(
        `Stripe : ${body?.error?.message ?? `HTTP ${res.status}`}`,
      );
    }
    return {
      providerPaymentId: String(body.id), // cs_…
      checkoutUrl: String(body.url),
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
    const header = String(headers['stripe-signature'] ?? '');
    const secret = webhookSecret ?? creds.webhookSecret;
    if (!header || !secret) return false;
    const parts = Object.fromEntries(
      header.split(',').map((p) => p.split('=') as [string, string]),
    );
    const t = parts['t'];
    const v1 = parts['v1'];
    if (!t || !v1) return false;
    const expected = createHmac('sha256', secret)
      .update(`${t}.${rawBody.toString('utf8')}`)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    const type = String(body?.type ?? '');
    const session = body?.data?.object ?? {};
    const ok = type === 'checkout.session.completed';
    return {
      eventId: String(body?.id ?? ''),
      providerPaymentId: String(session.id ?? ''),
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
      { headers: { Authorization: `Bearer ${creds.secretKey}` } },
    );
    const body = (await res.json()) as any;
    if (body?.payment_status === 'paid') return 'captured';
    if (body?.status === 'expired') return 'failed';
    return 'pending';
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl(ctx.apiEndpoint)}/balance`, {
        headers: { Authorization: `Bearer ${creds.secretKey}` },
      });
      if (res.status === 401) {
        return { ok: false, message: 'Secret Key Stripe invalide' };
      }
      return { ok: true, message: 'Identifiants Stripe acceptés' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
