import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { stores } from './stores';

export const contentBlocks = pgTable('content_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
  type: text('type').notNull().default('text'),
  groupName: text('group_name'),
  screen: text('screen'),
  label: text('label'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
