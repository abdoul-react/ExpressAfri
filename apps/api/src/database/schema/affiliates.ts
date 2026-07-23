import { pgTable, uuid, text, timestamp, decimal, integer } from 'drizzle-orm/pg-core'
import { stores } from './stores'
import { orders } from './orders'
import { coupons } from './coupons'

export const affiliates = pgTable('affiliates', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  country: text('country').notNull().default('Niger'),
  status: text('status').notNull().default('pending'),
  defaultCommissionRate: decimal('default_commission_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  paymentMethod: text('payment_method').notNull().default('orange_money'),
  paymentDetails: text('payment_details'),
  totalEarned: decimal('total_earned', { precision: 12, scale: 2 }).default('0'),
  totalPaid: decimal('total_paid', { precision: 12, scale: 2 }).default('0'),
  totalPending: decimal('total_pending', { precision: 12, scale: 2 }).default('0'),
  totalReferrals: integer('total_referrals').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const affiliateCommissions = pgTable('affiliate_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  affiliateId: uuid('affiliate_id').notNull().references(() => affiliates.id),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  couponId: uuid('coupon_id').references(() => coupons.id),
  couponCode: text('coupon_code'),
  customerName: text('customer_name'),
  orderAmount: decimal('order_amount', { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
