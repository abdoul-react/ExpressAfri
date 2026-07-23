import { Global, Module } from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { ConfigService } from '@nestjs/config'
import * as schema from './schema'

export type DrizzleDB = NodePgDatabase<typeof schema>

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION')

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({ connectionString: config.get<string>('DATABASE_URL') })
        return drizzle(pool, { schema }) as DrizzleDB
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
