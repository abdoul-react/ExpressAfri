import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider } from './payment-provider';
import * as crypto from 'crypto';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockPaymentProvider.name);
  private readonly secret = process.env.MOCK_PAYMENT_SECRET ?? 'mock-secret';

  async initialize(input: {
    paymentId: string;
    amount: string;
    currency: string;
    method: string;
    returnUrl?: string;
  }): Promise<{
    providerPaymentId: string;
    checkoutUrl?: string;
    status: 'pending' | 'authorized';
  }> {
    // Simulate a providerPaymentId and a checkout URL for redirect flows
    const providerPaymentId = `mock_${input.paymentId}_${Date.now()}`;
    const checkoutUrl = input.returnUrl
      ? `${input.returnUrl}?providerPaymentId=${providerPaymentId}`
      : undefined;
    // Default to 'pending' for card flows, 'authorized' for express flows
    const status = input.method === 'card' ? 'pending' : 'authorized';
    this.logger.debug(
      `Initialized mock payment ${providerPaymentId} status=${status}`,
    );
    return { providerPaymentId, checkoutUrl, status };
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    try {
      if (!signature) return false;
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(rawBody);
      const expected = hmac.digest('hex');
      const ok = crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature),
      );
      return ok;
    } catch (err) {
      this.logger.error('Failed to verify webhook signature', err as Error);
      return false;
    }
  }

  parseWebhook(rawBody: Buffer): {
    eventId: string;
    providerPaymentId: string;
    status: 'authorized' | 'captured' | 'failed' | 'refunded';
  } {
    try {
      const parsed = JSON.parse(rawBody.toString('utf8'));
      // Expect payload { eventId, providerPaymentId, status }
      const eventId = parsed.eventId ?? `evt_${Date.now()}`;
      const providerPaymentId =
        parsed.providerPaymentId ?? parsed.provider_payment_id ?? '';
      const status = (parsed.status ?? 'captured') as
        'authorized' | 'captured' | 'failed' | 'refunded';
      return { eventId, providerPaymentId, status };
    } catch (err) {
      this.logger.error('Failed to parse webhook payload', err as Error);
      return {
        eventId: `evt_${Date.now()}`,
        providerPaymentId: '',
        status: 'failed',
      };
    }
  }
}
