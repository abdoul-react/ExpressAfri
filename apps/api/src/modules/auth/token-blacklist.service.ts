import { Injectable, Inject, Logger } from '@nestjs/common';
import { REDIS, type RedisClient } from '../../common/redis/redis.module';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  async blacklist(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    try {
      await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
    } catch {
      this.logger.warn('Redis unavailable — token not added to blacklist');
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      const val = await this.redis.get(`blacklist:${jti}`);
      return val !== null;
    } catch {
      // Fail open: if Redis is down, assume token is valid
      return false;
    }
  }
}
