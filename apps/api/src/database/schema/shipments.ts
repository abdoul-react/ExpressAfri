import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { orders } from './orders'
import { stores } from './stores'

export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  deliveryPersonId: uuid('delivery_person_id'),
  status: text('status').default('preparing'),
  notes: text('notes'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const shipmentItems = pgTable('shipment_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  orderItemId: uuid('order_item_id').notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
