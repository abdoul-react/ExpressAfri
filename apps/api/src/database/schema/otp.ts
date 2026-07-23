import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const otpCodes = pgTable('otp_codes', {
  contact: text('contact').primaryKey(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
