import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull().default('other'),
  reporterId: text('reporter_id'),
  reporterName: text('reporter_name'),
  reporterEmail: text('reporter_email'),
  targetId: text('target_id'),
  targetName: text('target_name'),
  reason: text('reason').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  assignedTo: text('assigned_to'),
  resolution: text('resolution'),
  evidence: jsonb('evidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
