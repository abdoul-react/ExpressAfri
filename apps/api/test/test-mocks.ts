import { Provider } from '@nestjs/common';
import { PushService } from '../src/modules/push/push.service';
import { AuditService } from '../src/modules/audit/audit.service';

// Mock PushService: sendToCustomer is a no-op jest.fn()
export const mockPushServiceProvider: Provider = {
  provide: PushService,
  useValue: {
    sendToCustomer: jest.fn().mockResolvedValue(undefined),
    registerToken: jest.fn().mockResolvedValue(undefined),
    removeToken: jest.fn().mockResolvedValue(undefined),
  },
};

// Mock AuditService: list/create minimal implementations
export const mockAuditServiceProvider: Provider = {
  provide: AuditService,
  useValue: {
    list: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1 }),
    create: jest.fn().mockResolvedValue({}),
  },
};

// Export default array for convenience — inject explicitly in each TestingModule.
export const DEFAULT_TEST_PROVIDERS: Provider[] = [
  mockPushServiceProvider,
  mockAuditServiceProvider,
];
