import { pgTable, uuid, text, timestamp, decimal, integer, jsonb } from 'drizzle-orm/pg-core'
import { stores } from './stores'
import { customers } from './customers'
import { products } from './products'
import { productVariants } from './products'

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  customerId: uuid('customer_id').references(() => customers.id),
  orderNumber: text('order_number').notNull(),
  status: text('status').notNull().default('pending'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('XOF'),
  couponId: uuid('coupon_id'),
  couponCode: text('coupon_code'),
  idempotencyKey: text('idempotency_key'),
  shippingAddress: jsonb('shipping_address'),
  billingAddress: jsonb('billing_address'),
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  notes: text('notes'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  variantId: uuid('variant_id').references(() => productVariants.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  sku: text('sku'),
  label: text('label').notNull(),
  imageUrl: text('image_url'),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  status: text('status').default('pending'),
  issueReason: text('issue_reason'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const orderStatusLog = pgTable('order_status_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedBy: uuid('changed_by'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
