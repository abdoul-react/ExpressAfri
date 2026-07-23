import { pgTable, uuid, text, timestamp, decimal, boolean, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { stores } from './stores'
import { orders } from './orders'
import { payments } from './payments'

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  paymentId: uuid('payment_id').references(() => payments.id),
  orderNumber: text('order_number').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('XOF'),
  status: text('status').notNull().default('unsent'),
  type: text('type').notNull().default('email'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  downloadUrl: text('download_url'),
  fiscalYear: integer('fiscal_year'),
  sequenceNumber: integer('sequence_number'),
  snapshot: jsonb('snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  receiptsStoreYearSeqUnique: uniqueIndex('receipts_store_year_seq_unique')
    .on(table.storeId, table.fiscalYear, table.sequenceNumber)
    .where(sql`${table.fiscalYear} IS NOT NULL AND ${table.sequenceNumber} IS NOT NULL`),
  receiptsOrderIdUnique: uniqueIndex('receipts_order_id_unique')
    .on(table.orderId),
}))

export const receiptSettings = pgTable('receipt_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  autoSend: boolean('auto_send').default(false),
  defaultType: text('default_type').notNull().default('email'),
  prefix: text('prefix').default('REC-'),
  footerText: text('footer_text'),
  emailSubject: text('email_subject'),
  emailTemplate: text('email_template'),
  brandName: text('brand_name'),
  logoUrl: text('logo_url'),
  showBarcode: boolean('show_barcode').default(false),
  accentColor: text('accent_color').default('#f97316'),
  fiscalYear: integer('fiscal_year').notNull().default(sql`EXTRACT(YEAR FROM CURRENT_DATE)`),
  nextNumber: integer('next_number').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  receiptSettingsStoreYearUnique: uniqueIndex('receipt_settings_store_year_unique')
    .on(table.storeId, table.fiscalYear),
}))
