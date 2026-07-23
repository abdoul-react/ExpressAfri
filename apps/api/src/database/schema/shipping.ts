import { pgTable, uuid, text, timestamp, decimal, integer, boolean, jsonb } from 'drizzle-orm/pg-core'
import { stores } from './stores'

export const shippingZones = pgTable('shipping_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  countries: jsonb('countries').notNull().default('[]'),
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const shippingMethods = pgTable('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull().references(() => shippingZones.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  description: text('description'),
  baseRate: decimal('base_rate', { precision: 10, scale: 2 }).notNull().default('0'),
  freeThreshold: decimal('free_threshold', { precision: 10, scale: 2 }),
  estimatedDaysMin: integer('estimated_days_min').default(1),
  estimatedDaysMax: integer('estimated_days_max').default(7),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const shippingRules = pgTable('shipping_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull().references(() => shippingZones.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  type: text('type').notNull().default('weight'),
  minValue: decimal('min_value', { precision: 10, scale: 2 }).notNull().default('0'),
  maxValue: decimal('max_value', { precision: 10, scale: 2 }),
  rate: decimal('rate', { precision: 10, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
