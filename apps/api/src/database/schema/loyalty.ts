import { pgTable, uuid, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core'
import { stores } from './stores'
import { customers } from './customers'

export const loyaltyRules = pgTable('loyalty_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  points: integer('points').notNull(),
  conditions: jsonb('conditions'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const loyaltyRewards = pgTable('loyalty_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  type: text('type').notNull(),
  value: jsonb('value'),
  stock: integer('stock'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const loyaltyPoints = pgTable('loyalty_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  balance: integer('balance').notNull().default(0),
  lifetime: integer('lifetime').notNull().default(0),
  tier: text('tier').notNull().default('bronze'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
