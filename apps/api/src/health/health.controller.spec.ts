import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DRIZZLE } from '../database/database.module';
import { REDIS } from '../common/redis/redis.module';
import { MetricsService } from '../common/logger/metrics.service';

describe('HealthController (scenario 15)', () => {
  let controller: HealthController;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockDb = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        MetricsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: REDIS, useValue: mockRedis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('returns ok status with timestamp', () => {
      const result = controller.check();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('returns healthy when DB and Redis respond', async () => {
      const result: any = await controller.readiness();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('healthy');
      expect(result.redis).toBe('healthy');
    });

    it('returns unhealthy when DB is down (scenario 15)', async () => {
      mockDb.execute = jest
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const result: any = await controller.readiness();
      expect(result.status).toBe('error');
      expect(result.database).toBe('unhealthy');
      expect(result.redis).toBe('healthy');
    });

    it('returns unhealthy when Redis is down', async () => {
      mockRedis.ping = jest
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const result: any = await controller.readiness();
      expect(result.status).toBe('error');
      expect(result.database).toBe('healthy');
      expect(result.redis).toBe('unhealthy');
    });
  });

  describe('metrics', () => {
    it('returns initial metrics', () => {
      const result = controller.getMetrics();
      expect(result.totalRequests).toBe(0);
      expect(result.error5xx).toBe(0);
      expect(result.responseTimeMs).toBeDefined();
    });
  });
});
