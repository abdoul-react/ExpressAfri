import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { DRIZZLE } from '../../database/database.module';

describe('WishlistService', () => {
  let service: WishlistService;
  let mockResult: any;

  const mockQuery: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockImplementation(() => Promise.resolve(mockResult)),
  };
  const mockDb = {
    select: jest.fn(() => mockQuery),
    insert: jest.fn(() => mockQuery),
    delete: jest.fn(() => mockQuery),
    update: jest.fn(() => mockQuery),
  };

  beforeEach(async () => {
    mockResult = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [WishlistService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();
    service = module.get<WishlistService>(WishlistService);
  });

  describe('list', () => {
    it('returns wishlist items ordered by createdAt', async () => {
      const items = [
        { id: '1', customerId: 'c1', productId: 'p1', createdAt: new Date() },
      ];
      mockResult = items;
      mockQuery.orderBy = jest.fn().mockResolvedValue(items);

      const result = await service.list('c1');
      expect(result).toEqual(items);
    });
  });

  describe('add', () => {
    it('adds a product to wishlist', async () => {
      const item = {
        id: '1',
        customerId: 'c1',
        productId: 'p1',
        createdAt: new Date(),
      };
      mockQuery.limit = jest.fn().mockResolvedValue([]);
      mockQuery.returning = jest.fn().mockResolvedValue([item]);

      const result = await service.add('c1', 'p1');
      expect(result).toEqual(item);
    });

    it('throws ConflictException if product already in wishlist', async () => {
      mockQuery.limit = jest.fn().mockResolvedValue([{ id: '1' }]);

      await expect(service.add('c1', 'p1')).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('removes a product from wishlist', async () => {
      const item = {
        id: '1',
        customerId: 'c1',
        productId: 'p1',
        createdAt: new Date(),
      };
      mockQuery.returning = jest.fn().mockResolvedValue([item]);

      const result = await service.remove('c1', 'p1');
      expect(result).toEqual(item);
    });

    it('throws NotFoundException if product not in wishlist', async () => {
      mockQuery.returning = jest.fn().mockResolvedValue([]);

      await expect(service.remove('c1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('has', () => {
    it('returns true when product is in wishlist', async () => {
      mockQuery.limit = jest.fn().mockResolvedValue([{ id: '1' }]);

      const result = await service.has('c1', 'p1');
      expect(result).toEqual({ has: true });
    });

    it('returns false when product is not in wishlist', async () => {
      mockQuery.limit = jest.fn().mockResolvedValue([]);

      const result = await service.has('c1', 'p1');
      expect(result).toEqual({ has: false });
    });
  });
});
