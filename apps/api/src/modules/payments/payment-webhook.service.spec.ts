import { Test, TestingModule } from '@nestjs/testing';
import { PaymentWebhookService } from './payment-webhook.service';
import { GatewayRegistryService } from './gateway-registry.service';
import { MockAdapter } from './providers/adapters/mock.adapter';
import { DRIZZLE } from '../../database/database.module';
import { ChatService } from '../chat/chat.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConfigService } from '@nestjs/config';

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

function sign(raw: Buffer): Record<string, string> {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', MOCK_SECRET);
  hmac.update(raw);
  return { 'x-webhook-signature': hmac.digest('hex') };
}

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let registry: GatewayRegistryService;
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
        GatewayRegistryService,
        CryptoService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'JWT_SECRET' ? 'test-jwt' : undefined) },
        },
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
    registry = module.get<GatewayRegistryService>(GatewayRegistryService);
    registry.register(new MockAdapter());
    // La passerelle mock est activée en base (ligne seedée) : simulée ici
    mockDb.select = jest.fn(() =>
      makeChain([
        {
          code: 'mock',
          isEnabled: true,
          isSandbox: true,
          credentialsEncrypted: null,
          webhookSecretEncrypted: null,
          apiEndpoint: null,
        },
      ]),
    );
  });

  afterEach(() => {
    delete process.env.MOCK_PAYMENT_SECRET;
  });

  describe('processWebhook', () => {
    it('returns error for unsupported gateway', async () => {
      const result = await service.processWebhook(
        'unknown',
        Buffer.from('{}'),
        {},
      );
      expect(result.status).toBe('error');
    });

    it('returns error for invalid signature', async () => {
      const result = await service.processWebhook('mock', Buffer.from('{}'), {
        'x-webhook-signature': 'wrong-sig',
      });
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
      const result = await service.processWebhook('mock', raw, sign(raw));
      expect(result.status).toBe('error');
      expect(result.message).toContain('introuvable');
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

      const raw = Buffer.from(
        JSON.stringify({
          eventId: 'e-valid',
          providerPaymentId: 'pp-1',
          status: 'captured',
        }),
        'utf8',
      );

      const result = await service.processWebhook('mock', raw, sign(raw));
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

      const raw = Buffer.from(
        JSON.stringify({
          eventId: 'e-dup',
          providerPaymentId: 'pp-2',
          status: 'captured',
        }),
        'utf8',
      );

      const result = await service.processWebhook('mock', raw, sign(raw));
      expect(result.status).toBe('ignored');
    });
  });

  describe('GatewayRegistryService', () => {
    it('returns registered adapter by code', () => {
      expect(registry.getAdapter('mock')).toBeDefined();
      expect(registry.getAdapter('mock')!.code).toBe('mock');
    });

    it('returns undefined for unregistered adapter', () => {
      expect(registry.getAdapter('stripe')).toBeUndefined();
    });
  });
});
