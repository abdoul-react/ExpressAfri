import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const otpCodes = pgTable('otp_codes', {
  contact: text('contact').primaryKey(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(5),
  ipAddress: text('ip_address'),
  ipAttempts: integer('ip_attempts').default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
