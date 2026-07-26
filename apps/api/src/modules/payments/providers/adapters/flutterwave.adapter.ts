import { createHash, timingSafeEqual } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const PROD_URL = 'https://api.flutterwave.com/v3';

/**
 * Flutterwave — agrégateur panafricain (mobile money multi-pays, cartes) via
 * Standard checkout : POST /payments renvoie un lien hébergé. Webhook signé
 * par le header `verif-hash` (comparé au secret hash configuré côté compte).
 * Docs : https://developer.flutterwave.com
 */
export class FlutterwaveAdapter implements GatewayAdapter {
  readonly code = 'flutterwave';
  readonly label = 'Flutterwave';
  readonly credentialKeys = [
    { key: 'secretKey', label: 'Secret Key (FLWSECK-…)', secret: true },
    {
      key: 'webhookHash',
      label: 'Secret hash (webhooks)',
      secret: true,
      hint: 'Settings → Webhooks → Secret hash dans le dashboard Flutterwave',
    },
  ];

  private baseUrl(endpoint?: string | null): string {
    // Sandbox = clés de test sur la même URL
    return endpoint || PROD_URL;
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    const res = await fetch(`${this.baseUrl(input.apiEndpoint)}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.secretKey}`,
      },
      body: JSON.stringify({
        tx_ref: input.paymentId,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.returnUrl ?? '',
        customer: { phonenumber: input.phoneNumber ?? '' },
        customizations: { title: 'ExpressAfri' },
      }),
    });
    const body = (await res.json()) as any;
    if (body?.status !== 'success' || !body?.data?.link) {
      throw new Error(`Flutterwave : ${body?.message ?? `HTTP ${res.status}`}`);
    }
    return {
      providerPaymentId: input.paymentId, // tx_ref = notre id
      checkoutUrl: body.data.link,
      status: 'pending',
      raw: body,
    };
  }

  verifyWebhook(
    creds: GatewayCredentials,
    webhookSecret: string | null,
    _rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    // Flutterwave envoie le secret hash EN CLAIR dans `verif-hash` — la
    // vérification est une comparaison directe (via hash pour timing-safe).
    const received = String(headers['verif-hash'] ?? '');
    const secret = webhookSecret ?? creds.webhookHash;
    if (!received || !secret) return false;
    const a = createHash('sha256').update(received).digest();
    const b = createHash('sha256').update(secret).digest();
    return timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    const data = body?.data ?? {};
    const status = String(data.status ?? '');
    return {
      eventId: String(body?.event ?? '') + ':' + String(data.id ?? data.tx_ref ?? ''),
      providerPaymentId: String(data.tx_ref ?? ''),
      status: status === 'successful' ? 'captured' : 'failed',
    };
  }

  async getStatus(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'> {
    const res = await fetch(
      `${this.baseUrl(ctx.apiEndpoint)}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerPaymentId)}`,
      { headers: { Authorization: `Bearer ${creds.secretKey}` } },
    );
    const body = (await res.json()) as any;
    const status = String(body?.data?.status ?? '');
    if (status === 'successful') return 'captured';
    if (status === 'failed') return 'failed';
    return 'pending';
  }

  async refund(
    creds: GatewayCredentials,
    providerPaymentId: string,
    amount: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ refundId: string; status: 'pending' | 'done' }> {
    // Il faut l'id numérique Flutterwave : on le retrouve par tx_ref
    const verify = await fetch(
      `${this.baseUrl(ctx.apiEndpoint)}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerPaymentId)}`,
      { headers: { Authorization: `Bearer ${creds.secretKey}` } },
    );
    const vBody = (await verify.json()) as any;
    const flwId = vBody?.data?.id;
    if (!flwId) throw new Error('Flutterwave : transaction introuvable');
    const res = await fetch(
      `${this.baseUrl(ctx.apiEndpoint)}/transactions/${flwId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creds.secretKey}`,
        },
        body: JSON.stringify({ amount: Number(amount) }),
      },
    );
    const body = (await res.json()) as any;
    if (body?.status !== 'success') {
      throw new Error(`Flutterwave refund : ${body?.message ?? `HTTP ${res.status}`}`);
    }
    return { refundId: String(body?.data?.id ?? ''), status: 'pending' };
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(
        `${this.baseUrl(ctx.apiEndpoint)}/transactions?page=1`,
        { headers: { Authorization: `Bearer ${creds.secretKey}` } },
      );
      if (res.status === 401) {
        return { ok: false, message: 'Secret Key Flutterwave invalide' };
      }
      return { ok: true, message: 'Identifiants Flutterwave acceptés' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
