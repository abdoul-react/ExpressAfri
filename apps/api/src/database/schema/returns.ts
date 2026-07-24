import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { orders } from './orders';
import { customers } from './customers';
import { products } from './products';
import { admins } from './auth';

export const returns = pgTable('returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  customerId: uuid('customer_id').references(() => customers.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  refundAmount: decimal('refund_amount', { precision: 12, scale: 2 }),
  refundMethod: text('refund_method'),
  notes: text('notes'),
  reviewedBy: uuid('reviewed_by').references(() => admins.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const returnItems = pgTable('return_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnId: uuid('return_id')
    .notNull()
    .references(() => returns.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  variantId: uuid('variant_id'),
  quantity: integer('quantity').notNull(),
  condition: text('condition'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
