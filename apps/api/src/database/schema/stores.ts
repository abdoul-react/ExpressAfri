import { pgTable, uuid, text, timestamp, decimal, date, boolean } from 'drizzle-orm/pg-core'
import { admins } from './auth'

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  country: text('country').notNull().default('Niger'),
  status: text('status').notNull().default('pending'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const storeKyc = pgTable('store_kyc', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nationality: text('nationality').notNull(),
  dateOfBirth: date('date_of_birth'),
  nidNumber: text('nid_number'),
  rccm: text('rccm'),
  nif: text('nif'),
  businessType: text('business_type'),
  address: text('address'),
  status: text('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => admins.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
