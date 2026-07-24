import { pgTable, uuid, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { admins } from './auth';

export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  type: text('type').notNull().default('seller'),
  recipientId: uuid('recipient_id').notNull(),
  recipientName: text('recipient_name').notNull(),
  recipientEmail: text('recipient_email'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  fee: decimal('fee', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  method: text('method').notNull().default('orange_money'),
  accountDetails: text('account_details'),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  processedBy: uuid('processed_by').references(() => admins.id),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
