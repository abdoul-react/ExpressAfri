import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MobileService } from './mobile.service';
import { DRIZZLE } from '../../database/database.module';
import * as bcrypt from 'bcryptjs';

function makeChain(rows: any[] = []) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    and: () => chain,
    limit: () => chain,
    values: () => chain,
    set: () => chain,
    orderBy: () => chain,
    offset: () => chain,
    gte: () => chain,
    onConflictDoUpdate: () => chain,
    returning: () => chain,
    then: (resolve: any) => Promise.resolve(rows).then(resolve),
  };
  return chain;
}

describe('MobileService — OTP (scenario 12)', () => {
  let service: MobileService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(() => makeChain([])),
      insert: jest.fn(() => makeChain()),
      update: jest.fn(() => makeChain()),
      delete: jest.fn(() => makeChain()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'mock-token') },
        },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
  });

  describe('requestOtp', () => {
    it('rejects request if more than 3 OTPs requested in last hour', async () => {
      mockDb.select = jest.fn(() => makeChain([{ count: 3 }]));

      await expect(
        service.requestOtp('test@example.com', 'email'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates OTP code when under rate limit', async () => {
      mockDb.select = jest.fn(() => makeChain([{ count: 0 }]));
      const valuesChain = {
        onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert = jest.fn(() => ({ values: jest.fn(() => valuesChain) }));

      const result = await service.requestOtp('test@example.com', 'email');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('verifyOtp', () => {
    const validCodeHash = bcrypt.hashSync('123456', 10);
    const futureDate = new Date(Date.now() + 60000);
    const pastDate = new Date(Date.now() - 60000);

    it('rejects with UnauthorizedException when no OTP stored', async () => {
      mockDb.select = jest.fn(() => makeChain([]));

      await expect(
        service.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects already used code (scenario 12 — reused)', async () => {
      const stored = {
        codeHash: validCodeHash,
        usedAt: new Date(),
        expiresAt: futureDate,
        attempts: 0,
        maxAttempts: 5,
      };
      mockDb.select = jest.fn(() => makeChain([stored]));

      await expect(
        service.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects expired code (scenario 12 — expired)', async () => {
      const stored = {
        codeHash: validCodeHash,
        usedAt: null,
        expiresAt: pastDate,
        attempts: 0,
        maxAttempts: 5,
      };
      mockDb.select = jest.fn(() => makeChain([stored]));

      await expect(
        service.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects after max attempts exceeded (scenario 12 — 5 essais)', async () => {
      const stored = {
        codeHash: validCodeHash,
        usedAt: null,
        expiresAt: futureDate,
        attempts: 5,
        maxAttempts: 5,
      };
      mockDb.select = jest.fn(() => makeChain([stored]));

      await expect(
        service.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects incorrect code and increments attempts', async () => {
      const stored = {
        codeHash: validCodeHash,
        usedAt: null,
        expiresAt: futureDate,
        attempts: 0,
        maxAttempts: 5,
      };
      mockDb.select = jest.fn(() => makeChain([stored]));
      mockDb.update = jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      }));

      await expect(
        service.verifyOtp('test@example.com', 'wrong-code'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('accepts valid code and marks as used', async () => {
      const stored = {
        codeHash: validCodeHash,
        usedAt: null,
        expiresAt: futureDate,
        attempts: 0,
        maxAttempts: 5,
      };
      const customer = {
        id: 'cust-1',
        storeId: 's1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };

      let selectCall = 0;
      mockDb.select = jest.fn(() => {
        selectCall++;
        if (selectCall === 1) return makeChain([stored]);
        return makeChain([customer]);
      });
      mockDb.update = jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      }));
      mockDb.insert = jest.fn(() => ({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn(() => Promise.resolve([customer])),
      }));

      const result = await service.verifyOtp('test@example.com', '123456');
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
    });
  });
});
