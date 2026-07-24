import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  type: text('type', {
    enum: ['text', 'boolean', 'number', 'select', 'color', 'image'],
  })
    .notNull()
    .default('text'),
  label: text('label').notNull(),
  group: text('group').notNull().default('general'),
  description: text('description'),
  options: text('options').array(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  description: text('description'),
  group: text('group').notNull().default('general'),
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
