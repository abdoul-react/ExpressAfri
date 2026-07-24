import { Test, TestingModule } from '@nestjs/testing';
import { PaymentWebhookService } from './payment-webhook.service';
import { DRIZZLE } from '../../database/database.module';
import { ChatService } from '../chat/chat.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { AppLoggerService } from '../../common/logger/logger.service';

const MOCK_SECRET = 'test-secret-123';

function makeChain(rows: any[] = []) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    for: () => chain,
    set: () => chain,
    values: () => chain,
    returning: () => chain,
    then: (resolve: any) => Promise.resolve(rows).then(resolve),
  };
  return chain;
}

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let mockDb: any;
  let mockTx: any;

  beforeEach(async () => {
    process.env.MOCK_PAYMENT_SECRET = MOCK_SECRET;

    mockTx = {
      select: jest.fn(() => makeChain([])),
      update: jest.fn(() => makeChain()),
    };
    mockDb = {
      select: jest.fn(() => makeChain([])),
      update: jest.fn(() => makeChain()),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        MockPaymentProvider,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: ChatService,
          useValue: {
            postOrderSystemMessage: jest.fn().mockResolvedValue(undefined),
          },
        },
        AppLoggerService,
      ],
    }).compile();

    service = module.get<PaymentWebhookService>(PaymentWebhookService);
    const provider = module.get<MockPaymentProvider>(MockPaymentProvider);
    service.registerProvider(provider);
  });

  afterEach(() => {
    delete process.env.MOCK_PAYMENT_SECRET;
  });

  describe('processWebhook', () => {
    it('returns error for unsupported provider', async () => {
      const result = await service.processWebhook(
        'unknown',
        Buffer.from('{}'),
        'sig',
      );
      expect(result.status).toBe('error');
      expect(result.message).toContain('non supporté');
    });

    it('returns error for invalid signature', async () => {
      const result = await service.processWebhook(
        'mock',
        Buffer.from('{}'),
        'wrong-sig',
      );
      expect(result.status).toBe('error');
      expect(result.message).toContain('invalide');
    });

    it('returns error for unknown payment', async () => {
      mockTx.select = jest.fn(() => makeChain([]));
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const raw = Buffer.from(
        JSON.stringify({
          eventId: 'e1',
          providerPaymentId: 'pp-missing',
          status: 'captured',
        }),
      );
      const result = await service.processWebhook(
        'mock',
        raw,
        'any-signature-will-fail-here',
      );
      expect(result.status).toBe('error');
    });

    it('processes valid webhook', async () => {
      const payment = {
        id: 'pay-1',
        orderId: 'order-1',
        providerPaymentId: 'pp-1',
        amount: '100.00',
        currency: 'XOF',
        status: 'pending',
        webhookEventId: null,
      };
      mockTx.select = jest.fn(() => makeChain([payment]));
      mockTx.update = jest.fn(() => makeChain());
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const crypto = require('crypto');
      const payload = {
        eventId: 'e-valid',
        providerPaymentId: 'pp-1',
        status: 'captured',
      };
      const raw = Buffer.from(JSON.stringify(payload), 'utf8');
      const hmac = crypto.createHmac('sha256', MOCK_SECRET);
      hmac.update(raw);
      const sig = hmac.digest('hex');

      const result = await service.processWebhook('mock', raw, sig);
      expect(result.status).toBe('processed');
    });

    it('ignores duplicate webhook event idempotently', async () => {
      const payment = {
        id: 'pay-2',
        orderId: 'order-2',
        providerPaymentId: 'pp-2',
        amount: '100.00',
        currency: 'XOF',
        status: 'captured',
        webhookEventId: 'e-dup',
      };
      mockTx.select = jest.fn(() => makeChain([payment]));
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const crypto = require('crypto');
      const payload = {
        eventId: 'e-dup',
        providerPaymentId: 'pp-2',
        status: 'captured',
      };
      const raw = Buffer.from(JSON.stringify(payload), 'utf8');
      const hmac = crypto.createHmac('sha256', MOCK_SECRET);
      hmac.update(raw);
      const sig = hmac.digest('hex');

      const result = await service.processWebhook('mock', raw, sig);
      expect(result.status).toBe('ignored');
    });
  });

  describe('registerProvider / getProvider', () => {
    it('returns registered provider by name', () => {
      const p = service.getProvider('mock');
      expect(p).toBeDefined();
      expect(p!.name).toBe('mock');
    });

    it('returns undefined for unregistered provider', () => {
      const p = service.getProvider('stripe');
      expect(p).toBeUndefined();
    });
  });
});
