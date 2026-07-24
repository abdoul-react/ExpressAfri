import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { affiliates } from './affiliates';

export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default('percentage'),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  minPurchase: decimal('min_purchase', { precision: 10, scale: 2 }),
  maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true),
  usageLimitPerUser: integer('usage_limit_per_user'),
  usageLimitTotal: integer('usage_limit_total'),
  usedCount: integer('used_count').default(0),
  firstTimeOnly: boolean('first_time_only').default(false),
  applicableTo: text('applicable_to').notNull().default('all'),
  applicableId: uuid('applicable_id'),
  applicableName: text('applicable_name'),
  affiliateId: uuid('affiliate_id').references(() => affiliates.id),
  affiliateName: text('affiliate_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const couponUsage = pgTable('coupon_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  couponId: uuid('coupon_id')
    .notNull()
    .references(() => coupons.id),
  orderId: uuid('order_id').notNull(),
  customerId: uuid('customer_id'),
  customerEmail: text('customer_email'),
  discountAmount: decimal('discount_amount', {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
