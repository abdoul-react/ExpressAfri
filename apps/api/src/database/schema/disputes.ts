import { pgTable, uuid, text, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core'
import { stores } from './stores'
import { orders } from './orders'

export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  customerId: text('customer_id'),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  sellerId: text('seller_id'),
  sellerName: text('seller_name'),
  storeName: text('store_name'),
  productId: text('product_id'),
  productName: text('product_name'),
  productImage: text('product_image'),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  reason: text('reason').notNull().default('other'),
  status: text('status').notNull().default('open'),
  resolution: text('resolution'),
  resolutionAmount: decimal('resolution_amount', { precision: 12, scale: 2 }),
  resolutionNote: text('resolution_note'),
  description: text('description').notNull(),
  evidence: jsonb('evidence'),
  assignedAdminId: text('assigned_admin_id'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const disputeMessages = pgTable('dispute_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  disputeId: uuid('dispute_id').notNull().references(() => disputes.id, { onDelete: 'cascade' }),
  authorId: text('author_id'),
  authorName: text('author_name'),
  authorRole: text('author_role').notNull().default('customer'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const disputeTimeline = pgTable('dispute_timeline', {
  id: uuid('id').primaryKey().defaultRandom(),
  disputeId: uuid('dispute_id').notNull().references(() => disputes.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  note: text('note'),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  actorRole: text('actor_role').notNull().default('system'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
