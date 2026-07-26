import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

/**
 * Passerelle factice de développement : aucune clé requise, aucun réseau.
 * Reprend le comportement du MockPaymentProvider historique — la carte reste
 * `pending` (simule un 3DS), le mobile money est autorisé immédiatement.
 * Webhook signé HMAC-SHA256 avec MOCK_PAYMENT_SECRET (repli 'mock-secret').
 */
export class MockAdapter implements GatewayAdapter {
  readonly code = 'mock';
  readonly label = 'Mock (développement)';
  readonly credentialKeys = [];

  private get secret(): string {
    return process.env.MOCK_PAYMENT_SECRET ?? 'mock-secret';
  }

  async initialize(
    _creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    const providerPaymentId = `mock_${input.paymentId}_${Date.now()}`;
    return {
      providerPaymentId,
      checkoutUrl: input.returnUrl
        ? `${input.returnUrl}?providerPaymentId=${encodeURIComponent(providerPaymentId)}`
        : undefined,
      status: input.method === 'card' ? 'pending' : 'authorized',
    };
  }

  verifyWebhook(
    _creds: GatewayCredentials,
    webhookSecret: string | null,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const signature = String(headers['x-webhook-signature'] ?? '');
    const expected = createHmac('sha256', webhookSecret ?? this.secret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    return {
      eventId: String(body.eventId ?? ''),
      providerPaymentId: String(body.providerPaymentId ?? ''),
      status: body.status ?? 'captured',
    };
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    return { ok: true, message: 'Mock : toujours disponible' };
  }
}
