import { Injectable, Inject, Logger } from '@nestjs/common'
import { eq, and, or, lte, isNull, sql, inArray } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { outboxEvents } from '../../database/schema/outbox'

const BATCH_SIZE = 10
const MAX_RETRY_INTERVAL_S = 60

type OutboxRow = typeof outboxEvents.$inferSelect

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name)

  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async createEvent(params: {
    type: string
    aggregateType: string
    aggregateId: string
    idempotencyKey: string
    payload: Record<string, unknown>
  }): Promise<void> {
    try {
      await this.db.insert(outboxEvents).values({
        type: params.type,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        idempotencyKey: params.idempotencyKey,
        payload: params.payload,
      }).onConflictDoNothing()
    } catch (err) {
      this.logger.warn(`createEvent échoué pour ${params.idempotencyKey}: ${(err as Error)?.message}`)
    }
  }

  async createEventInTx(
    tx: any,
    params: {
      type: string
      aggregateType: string
      aggregateId: string
      idempotencyKey: string
      payload: Record<string, unknown>
    },
  ): Promise<void> {
    try {
      await tx.insert(outboxEvents).values({
        type: params.type,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        idempotencyKey: params.idempotencyKey,
        payload: params.payload,
      }).onConflictDoNothing()
    } catch (err) {
      this.logger.warn(`createEventInTx échoué pour ${params.idempotencyKey}: ${(err as Error)?.message}`)
    }
  }

  async claimBatch(batchSize: number = BATCH_SIZE): Promise<OutboxRow[]> {
    return this.db.transaction(async (tx) => {
      const events = await tx.select().from(outboxEvents)
        .where(and(
          eq(outboxEvents.status, 'pending'),
          or(
            isNull(outboxEvents.nextAttemptAt),
            lte(outboxEvents.nextAttemptAt, sql`NOW()`),
          ),
          lte(outboxEvents.attempts, outboxEvents.maxAttempts),
        ))
        .orderBy(outboxEvents.attempts, outboxEvents.createdAt)
        .limit(batchSize)
        .for('update')

      if (events.length > 0) {
        const ids = events.map((e: OutboxRow) => e.id)
        await tx.update(outboxEvents)
          .set({ status: 'processing' })
          .where(inArray(outboxEvents.id, ids))
      }
      return events
    })
  }

  async markDone(id: string): Promise<void> {
    await this.db.update(outboxEvents)
      .set({ status: 'done', processedAt: new Date() })
      .where(eq(outboxEvents.id, id))
  }

  async markFailed(id: string, error: string): Promise<void> {
    const delay = sql`LEAST(
      interval '1 second' * power(2, ${outboxEvents.attempts}),
      interval '${sql.raw(String(MAX_RETRY_INTERVAL_S))} seconds'
    )`
    await this.db.update(outboxEvents)
      .set({
        status: sql`CASE WHEN ${outboxEvents.attempts} + 1 >= ${outboxEvents.maxAttempts} THEN 'failed' ELSE 'pending' END`,
        attempts: sql`${outboxEvents.attempts} + 1`,
        lastError: error.slice(0, 500),
        nextAttemptAt: sql`CASE WHEN ${outboxEvents.attempts} + 1 < ${outboxEvents.maxAttempts} THEN NOW() + ${delay} ELSE NULL END`,
      })
      .where(eq(outboxEvents.id, id))
  }

  async processNextBatch(handler: (event: OutboxRow) => Promise<void>): Promise<number> {
    const events = await this.claimBatch(BATCH_SIZE)
    for (const event of events) {
      try {
        await handler(event)
        await this.markDone(event.id)
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err)
        this.logger.error(`Échec traitement outbox ${event.id} (${event.type}): ${msg}`)
        await this.markFailed(event.id, msg)
      }
    }
    return events.length
  }

}
