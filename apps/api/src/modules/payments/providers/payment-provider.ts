export interface PaymentProvider {
  readonly name: string;

  initialize(input: {
    paymentId: string;
    amount: string;
    currency: string;
    method: string;
    returnUrl?: string;
  }): Promise<{
    providerPaymentId: string;
    checkoutUrl?: string;
    status: 'pending' | 'authorized';
  }>;

  verifyWebhook(rawBody: Buffer, signature: string): boolean;

  parseWebhook(rawBody: Buffer): {
    eventId: string;
    providerPaymentId: string;
    status: 'authorized' | 'captured' | 'failed' | 'refunded';
  };
}
