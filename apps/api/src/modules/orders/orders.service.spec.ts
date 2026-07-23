import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { DRIZZLE } from '../../database/database.module'
import { ChatService } from '../chat/chat.service'
import { ReceiptsService } from '../receipts/receipts.service'
import { OutboxService } from '../notifications/outbox.service'
import { AuditService } from '../audit/audit.service'
import { AppLoggerService } from '../../common/logger/logger.service'

function makeChain(rows: any[] = []) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    and: () => chain,
    orderBy: () => chain,
    values: () => chain,
    set: () => chain,
    for: () => chain,
    returning: () => chain,
    offset: () => chain,
    limit: () => chain,
    gte: () => chain,
    then: (resolve: any) => Promise.resolve(rows).then(resolve),
  }
  return chain
}

describe('OrdersService', () => {
  let service: OrdersService
  let mockDb: any
  let mockTx: any

  const mockServices = {
    chat: { postOrderSystemMessage: jest.fn() },
    receipts: { create: jest.fn(), send: jest.fn() },
    outbox: { createEventInTx: jest.fn() },
    audit: { create: jest.fn() },
  }

  beforeEach(async () => {
    mockTx = { select: jest.fn(() => makeChain([])), insert: jest.fn(() => makeChain()), update: jest.fn(() => makeChain()) }
    mockDb = {
      select: jest.fn(() => makeChain([])),
      insert: jest.fn(() => makeChain()),
      update: jest.fn(() => makeChain()),
      transaction: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: ChatService, useValue: mockServices.chat },
        { provide: ReceiptsService, useValue: mockServices.receipts },
        { provide: OutboxService, useValue: mockServices.outbox },
        { provide: AuditService, useValue: mockServices.audit },
        AppLoggerService,
      ],
    }).compile()

    service = module.get<OrdersService>(OrdersService)
  })

  describe('getById', () => {
    it('returns null when order not found', async () => {
      mockDb.select = jest.fn(() => makeChain([]))
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })

    it('returns order with items and statusLog', async () => {
      const order = { id: 'order-1', storeId: 's1', status: 'confirmed', orderNumber: 'EXP-001' }
      const items = [{ id: 'item-1', orderId: 'order-1' }]
      const statusLog = [{ id: 'log-1', orderId: 'order-1' }]

      mockDb.select = jest.fn()
        .mockImplementationOnce(() => makeChain([order]))
        .mockImplementationOnce(() => makeChain(items))
        .mockImplementationOnce(() => {
          const chain = makeChain(statusLog)
          chain.where = () => chain
          chain.orderBy = () => chain
          return chain
        })

      const result = await service.getById('order-1')
      expect(result).toBeDefined()
      expect(result!.id).toBe('order-1')
      expect(result!.items).toEqual(items)
      expect(result!.statusLog).toEqual(statusLog)
    })
  })

  describe('updateStatus', () => {
    it('returns null when order not found', async () => {
      mockDb.select = jest.fn(() => makeChain([]))
      const result = await service.updateStatus('nonexistent', 'confirmed')
      expect(result).toBeNull()
    })

    it('updates status with valid transition', async () => {
      const order = { id: 'order-1', storeId: 's1', status: 'pending', orderNumber: 'EXP-001', customerId: null }
      mockDb.select = jest.fn(() => makeChain([order]))
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))

      const result = await service.updateStatus('order-1', 'confirmed')
      expect(result).toBeDefined()
    })

    it('throws BadRequestException for invalid transition', async () => {
      const order = { id: 'order-1', storeId: 's1', status: 'pending', orderNumber: 'EXP-001', customerId: null }
      mockDb.select = jest.fn(() => makeChain([order]))

      await expect(service.updateStatus('order-1', 'delivered'))
        .rejects.toThrow(BadRequestException)
    })
  })

  describe('createShipment', () => {
    it('throws NotFoundException for invalid order', async () => {
      mockDb.select = jest.fn(() => makeChain([]))
      await expect(service.createShipment('order-nonexistent', { items: [] }))
        .rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException for invalid order status', async () => {
      const order = { id: 'order-1', storeId: 's1', status: 'pending', orderNumber: 'EXP-001' }
      mockDb.select = jest.fn(() => makeChain([order]))
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))

      await expect(service.createShipment('order-1', { items: [{ orderItemId: 'i1', quantity: 1 }] }))
        .rejects.toThrow(BadRequestException)
    })

    it('allows partial shipment (3 of 5 items) — scenario 5', async () => {
      const order = { id: 'order-1', storeId: 's1', status: 'confirmed', orderNumber: 'EXP-001' }
      const items = [
        { id: 'i1', orderId: 'order-1', label: 'Item A', quantity: 1, status: 'pending' },
        { id: 'i2', orderId: 'order-1', label: 'Item B', quantity: 1, status: 'pending' },
        { id: 'i3', orderId: 'order-1', label: 'Item C', quantity: 1, status: 'pending' },
      ]

      mockDb.select = jest.fn(() => makeChain([order]))

      let selectCall = 0
      let itemIdx = 0
      mockTx.select = jest.fn(() => {
        selectCall++
        if (selectCall === 7) {
          return makeChain(items.map((i) => ({ ...i, status: 'ready' })))
        }
        if (selectCall % 2 === 1) {
          const idx = itemIdx++
          return makeChain([items[idx]])
        }
        return makeChain([])
      })

      mockTx.insert = jest.fn(() => makeChain([{ id: 'ship-1', orderId: 'order-1', status: 'preparing' }]))

      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))

      const result = await service.createShipment('order-1', {
        items: [
          { orderItemId: 'i1', quantity: 1 },
          { orderItemId: 'i2', quantity: 1 },
          { orderItemId: 'i3', quantity: 1 },
        ],
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('ship-1')
      expect(mockServices.outbox.createEventInTx).toHaveBeenCalled()
      expect(mockServices.audit.create).toHaveBeenCalled()
    })

    it('rejects duplicate shipment of already-shipped item — scenario 6', async () => {
      const order = { id: 'order-1', storeId: 's1', status: 'confirmed', orderNumber: 'EXP-001' }
      const item = { id: 'i1', orderId: 'order-1', label: 'Item A', quantity: 2, status: 'pending' }

      mockDb.select = jest.fn(() => makeChain([order]))

      const qtyChain = makeChain()
      qtyChain.then = (resolve: any) => Promise.resolve([{ qty: 2 }]).then(resolve)

      mockTx.select = jest.fn()
        .mockImplementationOnce(() => makeChain([item]))
        .mockImplementationOnce(() => qtyChain)

      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))

      await expect(service.createShipment('order-1', {
        items: [{ orderItemId: 'i1', quantity: 1 }],
      })).rejects.toThrow(BadRequestException)
    })
  })

  describe('list', () => {
    it('returns paginated orders', async () => {
      const orders = [{ id: 'order-1', storeId: 's1', status: 'confirmed', orderNumber: 'EXP-001' }]

      mockDb.select = jest.fn()
        .mockImplementationOnce(() => makeChain(orders))
        .mockImplementationOnce(() => makeChain([{ count: '1' }]))

      const result = await service.list({ page: 1, limit: 10 })
      expect(result.data).toEqual(orders)
      expect(result.total).toBe(1)
    })
  })
})
