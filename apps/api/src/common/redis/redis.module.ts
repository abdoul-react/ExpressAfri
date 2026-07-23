import { Global, Module } from '@nestjs/common'
import Redis from 'ioredis'
import { ConfigService } from '@nestjs/config'

export const REDIS = Symbol('REDIS_CONNECTION')

export type RedisClient = Redis

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis(config.get<string>('REDIS_URL') || 'redis://localhost:6379')
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
