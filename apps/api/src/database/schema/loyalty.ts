import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  varchar,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { customers } from './customers';

export const loyaltyRules = pgTable('loyalty_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .references(() => stores.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  points: integer('points').notNull(),
  conditions: jsonb('conditions'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const loyaltyRewards = pgTable('loyalty_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .references(() => stores.id),
  name: text('name').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  type: text('type').notNull(),
  value: jsonb('value'),
  stock: integer('stock'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const loyaltyPoints = pgTable('loyalty_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  balance: integer('balance').notNull().default(0),
  lifetime: integer('lifetime').notNull().default(0),
  tier: text('tier').notNull().default('bronze'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  points: integer('points').notNull(),
  balance: integer('balance').notNull(),
  description: text('description'),
  referenceId: uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
