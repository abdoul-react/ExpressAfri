import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const PROD_URL = 'https://app.paydunya.com/api/v1';
const SANDBOX_URL = 'https://app.paydunya.com/sandbox-api/v1';

/**
 * PayDunya — agrégateur UEMOA via checkout hébergé (PSR : Payment Standard
 * Redirect). Auth par headers PAYDUNYA-MASTER-KEY / PRIVATE-KEY / TOKEN.
 * Le webhook (IPN) porte un hash SHA-512 de la master key : on le vérifie
 * en comparant au hash de la clé configurée. Docs : https://paydunya.com/developers
 */
export class PaydunyaAdapter implements GatewayAdapter {
  readonly code = 'paydunya';
  readonly label = 'PayDunya';
  readonly credentialKeys = [
    { key: 'masterKey', label: 'Master Key', secret: true },
    { key: 'privateKey', label: 'Private Key', secret: true },
    { key: 'token', label: 'Token', secret: true },
  ];

  private baseUrl(isSandbox: boolean, endpoint?: string | null): string {
    return endpoint || (isSandbox ? SANDBOX_URL : PROD_URL);
  }

  private headers(creds: GatewayCredentials): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': creds.masterKey,
      'PAYDUNYA-PRIVATE-KEY': creds.privateKey,
      'PAYDUNYA-TOKEN': creds.token,
    };
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    const res = await fetch(
      `${this.baseUrl(input.isSandbox, input.apiEndpoint)}/checkout-invoice/create`,
      {
        method: 'POST',
        headers: this.headers(creds),
        body: JSON.stringify({
          invoice: {
            total_amount: Math.round(Number(input.amount)),
            description: `Commande ExpressAfri ${input.paymentId}`,
          },
          store: { name: 'ExpressAfri' },
          custom_data: { paymentId: input.paymentId },
          actions: {
            return_url: input.returnUrl ?? '',
            callback_url: input.notifyUrl ?? '',
          },
        }),
      },
    );
    const body = (await res.json()) as any;
    if (body?.response_code !== '00' || !body?.response_text) {
      throw new Error(`PayDunya : ${body?.response_text ?? `HTTP ${res.status}`}`);
    }
    return {
      providerPaymentId: String(body.token),
      checkoutUrl: String(body.response_text), // URL du checkout hébergé
      status: 'pending',
      raw: body,
    };
  }

  verifyWebhook(
    creds: GatewayCredentials,
    _webhookSecret: string | null,
    rawBody: Buffer,
    _headers: Record<string, string | string[] | undefined>,
  ): boolean {
    // L'IPN PayDunya inclut data.hash = SHA-512(masterKey). Pas de signature
    // du corps : on authentifie l'émetteur par la connaissance de la clé.
    try {
      const body = JSON.parse(rawBody.toString('utf8'));
      const received = String(body?.data?.hash ?? body?.hash ?? '');
      if (!received || !creds.masterKey) return false;
      const { createHash, timingSafeEqual } = require('node:crypto');
      const expected = createHash('sha512')
        .update(creds.masterKey)
        .digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(received);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    const data = body?.data ?? body;
    const token = data?.invoice?.token ?? data?.token ?? '';
    const status = String(data?.status ?? '');
    return {
      eventId: `${token}:${status}`,
      providerPaymentId: String(token),
      status: status === 'completed' ? 'captured' : 'failed',
    };
  }

  async getStatus(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'> {
    const res = await fetch(
      `${this.baseUrl(ctx.isSandbox, ctx.apiEndpoint)}/checkout-invoice/confirm/${encodeURIComponent(providerPaymentId)}`,
      { headers: this.headers(creds) },
    );
    const body = (await res.json()) as any;
    const status = String(body?.status ?? '');
    if (status === 'completed') return 'captured';
    if (status === 'cancelled' || status === 'failed') return 'failed';
    return 'pending';
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(
        `${this.baseUrl(ctx.isSandbox, ctx.apiEndpoint)}/checkout-invoice/confirm/test-connection`,
        { headers: this.headers(creds) },
      );
      // 401 = clés refusées ; toute réponse structurée = clés acceptées
      if (res.status === 401) {
        return { ok: false, message: 'Clés PayDunya refusées' };
      }
      return { ok: true, message: 'Identifiants PayDunya acceptés' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
