import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { products } from './products';
import { customers } from './customers';

export const productReviews = pgTable('product_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  rating: integer('rating').notNull(),
  title: text('title'),
  content: text('content'),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
