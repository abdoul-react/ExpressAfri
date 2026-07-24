import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { stores } from './stores';
import { orders } from './orders';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    method: text('method').notNull().default('orange_money'),
    status: text('status').notNull().default('pending'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('XOF'),
    transactionId: text('transaction_id'),
    provider: text('provider'),
    providerPaymentId: text('provider_payment_id'),
    failureCode: text('failure_code'),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    metadata: jsonb('metadata'),
    webhookEventId: text('webhook_event_id'),
    gatewayResponse: jsonb('gateway_response'),
    idempotencyKey: text('idempotency_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    paymentsProviderIdempotencyUnique: uniqueIndex(
      'payments_provider_idempotency_unique',
    )
      .on(table.provider, table.idempotencyKey)
      .where(
        sql`${table.provider} IS NOT NULL AND ${table.idempotencyKey} IS NOT NULL`,
      ),
  }),
);

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  gatewayRefundId: text('gateway_refund_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
