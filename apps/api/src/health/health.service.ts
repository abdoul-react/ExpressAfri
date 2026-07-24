import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module';
import { REDIS, type RedisClient } from '../common/redis/redis.module';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(REDIS) private redis: RedisClient,
  ) {}

  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async readiness() {
    const checks: Record<string, string> = {};
    let allHealthy = true;

    try {
      await this.db.execute(sql`SELECT 1`);
      checks.database = 'healthy';
    } catch {
      checks.database = 'unhealthy';
      allHealthy = false;
    }

    try {
      await this.redis.ping();
      checks.redis = 'healthy';
    } catch {
      checks.redis = 'unhealthy';
      allHealthy = false;
    }

    return { status: allHealthy ? 'ok' : 'error', ...checks };
  }
}
