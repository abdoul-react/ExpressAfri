import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from './outbox.service';
import { DRIZZLE } from '../../database/database.module';
import { AppLoggerService } from '../../common/logger/logger.service';

function makeChain(resolveValue: any[] = []) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    and: () => chain,
    or: () => chain,
    isNull: () => chain,
    lte: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    for: () => chain,
    values: () => chain,
    set: () => chain,
    returning: () => chain,
    inArray: () => chain,
    then: (resolve: any) => Promise.resolve(resolveValue).then(resolve),
  };
  return chain;
}

describe('OutboxService', () => {
  let service: OutboxService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(() => makeChain()),
      insert: jest.fn(() => makeChain()),
      update: jest.fn(() => makeChain()),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        AppLoggerService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  describe('createEvent', () => {
    it('inserts a new event with onConflictDoNothing', async () => {
      const valuesChain = {
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert = jest.fn(() => ({ values: jest.fn(() => valuesChain) }));

      await service.createEvent({
        type: 'order.created',
        aggregateType: 'order',
        aggregateId: 'order-1',
        idempotencyKey: 'idem-order-1',
        payload: { total: '100.00' },
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('createEventInTx', () => {
    it('inserts event within a transaction', async () => {
      const valuesChain = {
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
      };
      const mockTx = {
        insert: jest.fn(() => ({ values: jest.fn(() => valuesChain) })),
      };

      await service.createEventInTx(mockTx, {
        type: 'order.shipped',
        aggregateType: 'order',
        aggregateId: 'order-1',
        idempotencyKey: 'idem-ship-1',
        payload: { tracking: 'TRACK123' },
      });

      expect(mockTx.insert).toHaveBeenCalled();
    });
  });

  describe('claimBatch', () => {
    it('returns an empty batch when no pending events', async () => {
      const mockTx = {
        select: jest.fn(() => makeChain([])),
        update: jest.fn(() => makeChain()),
      };
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const batch = await service.claimBatch();
      expect(batch).toEqual([]);
    });

    it('claims pending events and marks them in_progress', async () => {
      const pendingEvents = [
        { id: 'e1', type: 'order.created', status: 'pending' },
        { id: 'e2', type: 'payment.captured', status: 'pending' },
      ];
      const mockTx = {
        select: jest.fn(() => makeChain(pendingEvents)),
        update: jest.fn(() => makeChain()),
      };
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const batch = await service.claimBatch();
      expect(batch).toHaveLength(2);
    });
  });

  describe('markDone / markFailed', () => {
    it('marks event as done', async () => {
      mockDb.update = jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn(() => Promise.resolve(undefined)),
      }));

      await service.markDone('e1');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('marks event as failed', async () => {
      mockDb.update = jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn(() => Promise.resolve(undefined)),
      }));

      await service.markFailed('e1', 'some error');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
