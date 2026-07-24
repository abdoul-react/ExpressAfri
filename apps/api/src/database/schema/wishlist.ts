import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { products } from './products';

export const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  uniq: unique('wishlist_items_customer_product_uniq').on(t.customerId, t.productId),
}));
