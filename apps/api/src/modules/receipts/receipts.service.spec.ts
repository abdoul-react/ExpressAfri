import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ReceiptsService } from './receipts.service'
import { DRIZZLE } from '../../database/database.module'
import { ChatService } from '../chat/chat.service'
import { AuditService } from '../audit/audit.service'

function makeChain(rows: any[] = []) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    orderBy: () => chain,
    values: () => chain,
    set: () => chain,
    for: () => chain,
    returning: () => chain,
    offset: () => chain,
    or: () => chain,
    like: () => chain,
    and: () => chain,
    gte: () => chain,
    then: (resolve: any) => Promise.resolve(rows).then(resolve),
  }
  return chain
}

describe('ReceiptsService', () => {
  let service: ReceiptsService
  let mockDb: any
  let mockStorage: any
  let mockTx: any

  beforeEach(async () => {
    mockStorage = { save: jest.fn().mockResolvedValue('https://storage.example.com/receipt.pdf') }
    mockTx = { select: jest.fn(() => makeChain([])), insert: jest.fn(() => makeChain()), update: jest.fn(() => makeChain()) }
    mockDb = {
      select: jest.fn(() => makeChain([])),
      insert: jest.fn(() => makeChain()),
      update: jest.fn(() => makeChain()),
      transaction: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: 'STORAGE_SERVICE', useValue: mockStorage },
        { provide: ChatService, useValue: { postOrderSystemMessage: jest.fn().mockResolvedValue(undefined) } },
        { provide: AuditService, useValue: { create: jest.fn() } },
      ],
    }).compile()

    service = module.get<ReceiptsService>(ReceiptsService)
  })

  describe('create', () => {
    it('throws NotFoundException for unknown order', async () => {
      mockDb.select = jest.fn(() => makeChain([]))
      await expect(service.create({ orderId: 'nonexistent', storeId: 's1' }))
        .rejects.toThrow(NotFoundException)
    })

    it('returns existing receipt if already created (idempotent) — scenario 7', async () => {
      const order = { id: 'order-1', storeId: 's1', orderNumber: 'EXP-001', total: '100.00', currency: 'XOF', subtotal: '100.00', billingAddress: '{}', shippingCost: '0', taxAmount: '0', discountAmount: '0' }
      const existingReceipt = { id: 'receipt-1', orderId: 'order-1', orderNumber: 'REC-2026-000003', storeId: 's1' }

      mockDb.select = jest.fn(() => makeChain([order]))
      mockTx.select = jest.fn(() => makeChain([existingReceipt]))
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))

      const result = await service.create({ orderId: 'order-1', storeId: 's1' })
      expect(result.orderNumber).toBe('REC-2026-000003')
    })

    it('generates sequential unique receipt number via FOR UPDATE counter — scenario 8', async () => {
      const order = { id: 'order-1', storeId: 's1', orderNumber: 'EXP-001', total: '100.00', currency: 'XOF', subtotal: '100.00', billingAddress: JSON.stringify({ name: 'John Doe', email: 'john@test.com', phone: '0000000000' }), shippingCost: '0', taxAmount: '0', discountAmount: '0' }
      const settings = { storeId: 's1', prefix: 'REC-', nextNumber: 42, fiscalYear: 2026, brandName: 'Test', accentColor: '#000', footerText: 'Merci', showBarcode: false, defaultType: 'email' }

      mockDb.select = jest.fn(() => makeChain([order]))

      let selectCall = 0
      mockTx.select = jest.fn(() => {
        selectCall++
        if (selectCall === 1) return makeChain([]) // no existing receipt
        if (selectCall === 2) return makeChain([settings]) // receiptSettings with FOR UPDATE
        if (selectCall === 3) return makeChain([{ label: 'Product A', sku: 'SKU-A', quantity: 1, unitPrice: '100.00', totalPrice: '100.00' }]) // order items
        if (selectCall === 4) return makeChain([{ id: 'pay-1', method: 'orange_money', status: 'captured' }]) // payment
        return makeChain([])
      })

      mockTx.insert = jest.fn(() => makeChain([{
        id: 'receipt-42', orderId: 'order-1', orderNumber: 'REC-2026-000042',
        storeId: 's1', customerName: 'John Doe', amount: '100.00', currency: 'XOF',
      }]))

      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))

      const result = await service.create({ orderId: 'order-1', storeId: 's1' })
      expect(result).toBeDefined()
      expect(result.orderNumber).toBe('REC-2026-000042')
      expect(mockTx.update).toHaveBeenCalled()
    })
  })

  describe('send', () => {
    it('throws NotFoundException for unknown receipt', async () => {
      mockDb.select = jest.fn(() => makeChain([]))
      await expect(service.send('nonexistent')).rejects.toThrow(NotFoundException)
    })

    it('generates PDF via storage service and marks receipt as sent — scenario 9', async () => {
      const receipt = {
        id: 'receipt-1', orderId: 'order-1', storeId: 's1', orderNumber: 'REC-2026-000001',
        customerName: 'John Doe', customerEmail: 'john@test.com', customerPhone: '0000000000',
        amount: '100.00', currency: 'XOF', status: 'pending', downloadUrl: null,
        sentAt: null, createdAt: new Date(), billingAddress: null,
        snapshot: {
          items: [
            { label: 'Product A', sku: 'SKU-A', quantity: 1, unitPrice: '100.00', totalPrice: '100.00' },
            { label: 'Product B', sku: 'SKU-B', quantity: 2, unitPrice: '50.00', totalPrice: '100.00' },
          ],
          subtotal: '200.00', shippingCost: '0', taxAmount: '0', discountAmount: '0',
          paymentMethod: 'orange_money', paymentStatus: 'captured',
        } as any,
      }

      mockDb.select = jest.fn(() => makeChain([receipt]))
      mockDb.update = jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn(() => Promise.resolve([{ ...receipt, status: 'sent', downloadUrl: 'https://storage.example.com/receipt.pdf' }])),
      }))

      const result = await service.send('receipt-1')
      expect(result.status).toBe('sent')
      expect(result.downloadUrl).toBe('https://storage.example.com/receipt.pdf')
      expect(mockStorage.save).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('throws NotFoundException for unknown receipt', async () => {
      mockDb.select = jest.fn(() => makeChain([]))
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getOrderCustomerId', () => {
    it('returns customer id for a valid order', async () => {
      mockDb.select = jest.fn(() => makeChain([{ customerId: 'cust-1' }]))
      const result = await service.getOrderCustomerId('order-1')
      expect(result).toBe('cust-1')
    })

    it('returns null for unknown order', async () => {
      mockDb.select = jest.fn(() => makeChain([]))
      const result = await service.getOrderCustomerId('nonexistent')
      expect(result).toBeNull()
    })
  })
})
