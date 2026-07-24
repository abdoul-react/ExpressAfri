import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  varchar,
  boolean,
} from 'drizzle-orm/pg-core';
import { admins } from './auth';
import { stores } from './stores';

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull().default('banner'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  targetAudience: varchar('target_audience', { length: 64 }),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  budget: decimal('budget', { precision: 12, scale: 2 }),
  spent: decimal('spent', { precision: 12, scale: 2 }).default('0'),
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0'),
  targetType: varchar('target_type', { length: 50 }).default('all'),
  targetValue: varchar('target_value', { length: 255 }),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => admins.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
