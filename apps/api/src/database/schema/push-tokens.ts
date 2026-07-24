import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { customers } from './customers';

/**
 * Jetons Expo Push par appareil (multi-appareils par client). Le token est
 * unique : un même appareil qui change de compte réassocie sa ligne (upsert
 * sur `token`). Supprimé à la déconnexion, ou purgé quand Expo renvoie
 * `DeviceNotRegistered`.
 */
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: text('platform'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
