import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { DRIZZLE } from '../../database/database.module';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: DRIZZLE, useValue: mockDb },
        // AuditService est attendu par CustomersService
        require('../../../test/test-mocks').mockAuditServiceProvider,
      ],
    }).compile();
    service = module.get<CustomersService>(CustomersService);
  });

  describe('listAddresses', () => {
    it('returns addresses for a customer', async () => {
      const addresses = [
        {
          id: 'a1',
          customerId: 'c1',
          storeId: 's1',
          label: 'Maison',
          contactName: 'Jean',
          phone: '010203',
          street: 'Rue 1',
          city: 'Abidjan',
          countryCode: 'CI',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          apartment: null,
          province: null,
          postalCode: null,
        },
      ];
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(addresses),
      });

      const result = await service.listAddresses('c1');
      expect(result).toEqual(addresses);
    });
  });

  describe('createAddress', () => {
    it('creates first address as default', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: '0' }]),
      });
      const addr = {
        id: 'a1',
        customerId: 'c1',
        storeId: 's1',
        label: 'Maison',
        contactName: 'Jean',
        phone: '010203',
        street: 'Rue 1',
        city: 'Abidjan',
        countryCode: 'CI',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        apartment: null,
        province: null,
        postalCode: null,
      };
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([addr]),
      });
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.createAddress('c1', {
        storeId: 's1',
        contactName: 'Jean',
        phone: '010203',
        street: 'Rue 1',
        city: 'Abidjan',
        countryCode: 'CI',
      });
      expect(result.isDefault).toBe(true);
    });

    it('creates additional address as non-default', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: '1' }]),
      });
      const addr = {
        id: 'a1',
        customerId: 'c1',
        storeId: 's1',
        label: 'Bureau',
        contactName: 'Jean',
        phone: '010203',
        street: 'Rue 2',
        city: 'Abidjan',
        countryCode: 'CI',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        apartment: null,
        province: null,
        postalCode: null,
      };
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([addr]),
      });

      const result = await service.createAddress('c1', {
        storeId: 's1',
        contactName: 'Jean',
        phone: '010203',
        street: 'Rue 2',
        city: 'Abidjan',
        countryCode: 'CI',
        isDefault: false,
      });
      expect(result.isDefault).toBe(false);
    });
  });

  describe('updateAddress', () => {
    it('updates and returns the address', async () => {
      const addr = {
        id: 'a1',
        customerId: 'c1',
        storeId: 's1',
        label: 'Maison',
        contactName: 'Jean Updated',
        phone: '010203',
        street: 'Rue 1',
        city: 'Abidjan',
        countryCode: 'CI',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        apartment: null,
        province: null,
        postalCode: null,
      };
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([addr]),
      });

      const result = await service.updateAddress('a1', 'c1', {
        contactName: 'Jean Updated',
      });
      expect(result).toEqual(addr);
    });

    it('throws NotFoundException if address not found', async () => {
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      });

      await expect(service.updateAddress('unknown', 'c1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAddress', () => {
    it('deletes and returns the address', async () => {
      const addr = {
        id: 'a1',
        customerId: 'c1',
        storeId: 's1',
        label: 'Maison',
        contactName: 'Jean',
        phone: '010203',
        street: 'Rue 1',
        city: 'Abidjan',
        countryCode: 'CI',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        apartment: null,
        province: null,
        postalCode: null,
      };
      mockDb.delete.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([addr]),
      });

      const result = await service.deleteAddress('a1', 'c1');
      expect(result).toEqual(addr);
    });

    it('throws NotFoundException if address not found', async () => {
      mockDb.delete.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      });

      await expect(service.deleteAddress('unknown', 'c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefaultAddress', () => {
    it('sets address as default and clears others', async () => {
      const addr = {
        id: 'a1',
        customerId: 'c1',
        storeId: 's1',
        label: 'Maison',
        contactName: 'Jean',
        phone: '010203',
        street: 'Rue 1',
        city: 'Abidjan',
        countryCode: 'CI',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        apartment: null,
        province: null,
        postalCode: null,
      };
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([addr]),
      });
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([addr]),
      });

      const result = await service.setDefaultAddress('a1', 'c1');
      expect(result.isDefault).toBe(true);
    });

    it('throws NotFoundException if address not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(service.setDefaultAddress('unknown', 'c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
