import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const PROD_URL = 'https://api.orange.com';

/**
 * Orange Money Web Payment (API directe opérateur, zone OM). Deux temps :
 * OAuth2 client_credentials → POST /webpayment renvoie une payment_url.
 * La notification (notif_url) porte status FAILED/SUCCESS ; signature HMAC
 * optionnelle selon le contrat marchand. Docs : developer.orange.com
 */
export class OrangeMoneyAdapter implements GatewayAdapter {
  readonly code = 'orange_direct';
  readonly label = 'Orange Money (direct)';
  readonly credentialKeys = [
    {
      key: 'clientId',
      label: 'Client ID (OAuth)',
      secret: false,
      hint: 'Console developer.orange.com → votre application',
    },
    { key: 'clientSecret', label: 'Client Secret (OAuth)', secret: true },
    { key: 'merchantKey', label: 'Merchant Key', secret: true },
  ];

  private baseUrl(endpoint?: string | null): string {
    return endpoint || PROD_URL;
  }

  private async token(
    creds: GatewayCredentials,
    base: string,
  ): Promise<string> {
    const res = await fetch(`${base}/oauth/v3/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    const body = (await res.json()) as any;
    if (!body?.access_token) {
      throw new Error(
        `Orange Money OAuth : ${body?.error_description ?? `HTTP ${res.status}`}`,
      );
    }
    return String(body.access_token);
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    const base = this.baseUrl(input.apiEndpoint);
    const accessToken = await this.token(creds, base);
    const path = input.isSandbox
      ? '/orange-money-webpay/dev/v1/webpayment'
      : '/orange-money-webpay/v1/webpayment';
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        merchant_key: creds.merchantKey,
        currency: input.isSandbox ? 'OUV' : input.currency,
        order_id: input.paymentId,
        amount: Math.round(Number(input.amount)),
        return_url: input.returnUrl ?? '',
        cancel_url: input.returnUrl ?? '',
        notif_url: input.notifyUrl ?? '',
        lang: 'fr',
        reference: 'ExpressAfri',
      }),
    });
    const body = (await res.json()) as any;
    if (!body?.payment_url) {
      throw new Error(
        `Orange Money : ${body?.message ?? body?.description ?? `HTTP ${res.status}`}`,
      );
    }
    return {
      providerPaymentId: String(body.pay_token ?? input.paymentId),
      checkoutUrl: String(body.payment_url),
      status: 'pending',
      raw: body,
    };
  }

  verifyWebhook(
    _creds: GatewayCredentials,
    webhookSecret: string | null,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    // Sans secret configuré, la notification Orange n'est pas signée : on
    // refuse et on s'appuie sur getStatus (réconciliation active) — jamais
    // de confirmation sur la seule foi d'un POST anonyme.
    if (!webhookSecret) return false;
    const signature = String(
      headers['x-signature'] ?? headers['x-webhook-signature'] ?? '',
    );
    if (!signature) return false;
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    const status = String(body?.status ?? '');
    const token = String(body?.pay_token ?? body?.order_id ?? '');
    return {
      eventId: `${token}:${status}:${body?.txnid ?? ''}`,
      providerPaymentId: token,
      status: status === 'SUCCESS' ? 'captured' : 'failed',
    };
  }

  async getStatus(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'> {
    const base = this.baseUrl(ctx.apiEndpoint);
    const accessToken = await this.token(creds, base);
    const path = ctx.isSandbox
      ? '/orange-money-webpay/dev/v1/transactionstatus'
      : '/orange-money-webpay/v1/transactionstatus';
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ pay_token: providerPaymentId }),
    });
    const body = (await res.json()) as any;
    const status = String(body?.status ?? '');
    if (status === 'SUCCESS') return 'captured';
    if (status === 'FAILED' || status === 'EXPIRED') return 'failed';
    return 'pending';
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.token(creds, this.baseUrl(ctx.apiEndpoint));
      return { ok: true, message: 'OAuth Orange Money accepté' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
