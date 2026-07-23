import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { stores } from './stores'

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  key: text('key').notNull(),
  label: text('label').notNull(),
  channel: text('channel').notNull().default('email'),
  subject: text('subject'),
  body: text('body').notNull(),
  variables: text('variables').array().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  templateId: uuid('template_id'),
  channel: text('channel').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject'),
  body: text('body'),
  status: text('status').notNull().default('sent'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
})
