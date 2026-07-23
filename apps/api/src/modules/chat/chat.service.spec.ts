import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ChatService } from './chat.service'
import { DRIZZLE } from '../../database/database.module'

describe('ChatService', () => {
  let service: ChatService
  let mockResult: any

  const mockQuery: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockImplementation(() => Promise.resolve(mockResult)),
  }
  const mockDb = {
    select: jest.fn(() => mockQuery),
    insert: jest.fn(() => mockQuery),
    update: jest.fn(() => mockQuery),
    delete: jest.fn(() => mockQuery),
  }

  beforeEach(async () => {
    mockResult = []
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile()
    service = module.get<ChatService>(ChatService)
  })

  describe('listConversations', () => {
    it('returns conversations for a customer ordered by updatedAt desc', async () => {
      const conversations = [{ id: '1', customerId: 'c1', storeId: 's1', status: 'open', subject: 'Hello', createdAt: new Date(), updatedAt: new Date(), orderId: null }]
      mockQuery.orderBy = jest.fn().mockResolvedValue(conversations)

      const result = await service.listConversations('c1')
      expect(result).toEqual(conversations)
    })
  })

  describe('getConversation', () => {
    it('returns conversation in mobile format with mapped messages', async () => {
      const now = new Date()
      const conv = { id: '1', customerId: 'c1', storeId: 's1', status: 'open', subject: 'Hi', createdAt: now, updatedAt: now, orderId: null }
      const messages = [{ id: 'm1', conversationId: '1', senderId: 'c1', senderRole: 'customer', type: 'text', content: 'Hello', attachmentUrl: null, attachmentName: null, replyToId: null, deletedAt: null, createdAt: now, readAt: null }]
      // 1er limit → conversation ; 2e limit → boutique (introuvable ici)
      mockQuery.limit = jest.fn()
        .mockResolvedValueOnce([conv])
        .mockResolvedValue([])
      mockQuery.orderBy = jest.fn().mockResolvedValue(messages)

      const result = await service.getConversation('1', 'c1')
      expect(result).toEqual({
        id: '1',
        name: 'Hi', // pas de boutique trouvée → subject en fallback
        avatar: '',
        online: false,
        lastMessage: 'Hello',
        lastTime: now.toISOString(),
        unread: 0,
        status: 'open',
        orderRef: null,
        orderProduct: null,
        orderImage: null,
        messages: [{ id: 'm1', text: 'Hello', type: 'text', attachmentUrl: null, attachmentName: null, replyToId: null, replyToText: null, deleted: false, sentByMe: true, time: now.toISOString() }],
      })
    })

    it('throws NotFoundException if conversation not found', async () => {
      mockQuery.limit = jest.fn().mockResolvedValue([])

      await expect(service.getConversation('1', 'c1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('createConversation', () => {
    it('creates and returns a conversation', async () => {
      const conv = { id: '1', customerId: 'c1', storeId: 's1', status: 'open', subject: 'Help', createdAt: new Date(), updatedAt: new Date(), orderId: null }
      mockQuery.returning = jest.fn().mockResolvedValue([conv])

      const result = await service.createConversation({ customerId: 'c1', storeId: 's1', subject: 'Help' })
      expect(result).toEqual(conv)
    })
  })

  describe('closeConversation', () => {
    it('closes a conversation', async () => {
      const conv = { id: '1', customerId: 'c1', storeId: 's1', status: 'closed', subject: 'Hi', createdAt: new Date(), updatedAt: new Date(), orderId: null }
      mockQuery.returning = jest.fn().mockResolvedValue([conv])

      const result = await service.closeConversation('1', 'c1')
      expect(result.status).toBe('closed')
    })

    it('throws NotFoundException if conversation not found', async () => {
      mockQuery.returning = jest.fn().mockResolvedValue([])

      await expect(service.closeConversation('1', 'c1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('sendMessage', () => {
    it('sends a message and updates conversation', async () => {
      const msg = { id: 'm1', conversationId: '1', senderId: 'c1', senderRole: 'customer', content: 'Hello', createdAt: new Date(), readAt: null }
      mockQuery.returning = jest.fn().mockResolvedValue([msg])

      const result = await service.sendMessage('1', { id: 'c1', role: 'customer' }, { content: 'Hello' })
      expect(result).toEqual(msg)
    })
  })

  describe('markAsRead', () => {
    it('marks messages as read', async () => {
      mockQuery.limit = jest.fn().mockResolvedValue([{ id: '1' }])

      const result = await service.markAsRead('1', 'c1')
      expect(result).toEqual({ ok: true })
    })

    it('throws NotFoundException if conversation not found', async () => {
      mockQuery.limit = jest.fn().mockResolvedValue([])

      await expect(service.markAsRead('1', 'c1')).rejects.toThrow(NotFoundException)
    })
  })
})
