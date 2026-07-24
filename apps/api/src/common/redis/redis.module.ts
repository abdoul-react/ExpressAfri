import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS = Symbol('REDIS_CONNECTION');

export type RedisClient = Redis;

const logger = new Logger('RedisModule');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = new Redis(
          config.get<string>('REDIS_URL') || 'redis://localhost:6379',
          {
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 0,
            // Retry with capped backoff; return null after 5 attempts to stop retrying
            retryStrategy: (times) => {
              if (times > 5) return null;
              return Math.min(times * 2000, 10000);
            },
          },
        );
        // Suppress unhandled error events — failures are handled per-call
        client.on('error', (err: Error) => {
          if ((err as any).code === 'ECONNREFUSED') {
            if ((client as any)._redisWarnedOnce !== true) {
              (client as any)._redisWarnedOnce = true;
              logger.warn(
                'Redis unavailable — blacklist/outbox features disabled. Start Redis to enable them.',
              );
            }
          } else {
            logger.error(`Redis error: ${err.message}`);
          }
        });
        client.on('connect', () => {
          (client as any)._redisWarnedOnce = false;
          logger.log('Redis connected');
        });
        // Initiate connection in the background (lazyConnect = no throw on failure)
        client.connect().catch(() => {/* handled by error event */});
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
