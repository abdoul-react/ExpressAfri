import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { DRIZZLE } from '../../database/database.module'

describe('SettingsService', () => {
  let service: SettingsService
  let mockResult: any

  const mockQuery: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockImplementation(() => Promise.resolve(mockResult)),
  }
  const mockDb = {
    select: jest.fn(() => mockQuery),
    update: jest.fn(() => mockQuery),
  }

  beforeEach(async () => {
    mockResult = []
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile()
    service = module.get<SettingsService>(SettingsService)
  })

  describe('listSettings', () => {
    it('returns settings ordered by group and key', async () => {
      const settings = [{ id: '1', key: 'app.name', value: 'ExpressAfri', type: 'text', label: 'Name', group: 'general', description: null, options: null, updatedAt: new Date() }]
      mockQuery.orderBy = jest.fn().mockResolvedValue(settings)

      const result = await service.listSettings()
      expect(result).toEqual(settings)
    })
  })

  describe('updateSetting', () => {
    it('updates and returns the setting', async () => {
      const setting = { id: '1', key: 'app.name', value: 'NewName', type: 'text', label: 'Name', group: 'general', description: null, options: null, updatedAt: new Date() }
      mockQuery.returning = jest.fn().mockResolvedValue([setting])

      const result = await service.updateSetting('app.name', 'NewName')
      expect(result.value).toBe('NewName')
    })

    it('throws NotFoundException if setting not found', async () => {
      mockQuery.returning = jest.fn().mockResolvedValue([])

      await expect(service.updateSetting('unknown', 'val')).rejects.toThrow(NotFoundException)
    })
  })

  describe('listFeatureFlags', () => {
    it('returns feature flags ordered by group and key', async () => {
      const flags = [{ id: '1', key: 'wallet', label: 'Wallet', description: null, group: 'Payment', enabled: true, updatedAt: new Date() }]
      mockQuery.orderBy = jest.fn().mockResolvedValue(flags)

      const result = await service.listFeatureFlags()
      expect(result).toEqual(flags)
    })
  })

  describe('toggleFeatureFlag', () => {
    it('toggles a feature flag', async () => {
      const flag = { id: '1', key: 'wallet', label: 'Wallet', description: null, group: 'Payment', enabled: false, updatedAt: new Date() }
      mockQuery.returning = jest.fn().mockResolvedValue([flag])

      const result = await service.toggleFeatureFlag('wallet', false)
      expect(result.enabled).toBe(false)
    })

    it('throws NotFoundException if flag not found', async () => {
      mockQuery.returning = jest.fn().mockResolvedValue([])

      await expect(service.toggleFeatureFlag('unknown', true)).rejects.toThrow(NotFoundException)
    })
  })
})
