import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  parentId: uuid('parent_id').references((): any => categories.id, { onDelete: 'set null' }),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  categoryId: uuid('category_id').references(() => categories.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal('compare_price', { precision: 10, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  currency: text('currency').notNull().default('XOF'),
  weightKg: decimal('weight_kg', { precision: 8, scale: 3 }),
  status: text('status').notNull().default('draft'),
  moderationStatus: text('moderation_status').default('pending'),
  rejectionReason: text('rejection_reason'),
  isFeatured: boolean('is_featured').default(false),
  tags: text('tags').array(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  sku: text('sku').notNull(),
  label: text('label').notNull(),
  /** Attributs structurés : [{ name: "Taille", value: "L" }, ...]. Calculé depuis `attributes`, stocké pour les requêtes rapides. */
  attributes: jsonb('attributes')
    .$type<{ name: string; value: string }[]>()
    .default([]),
  price: decimal('price', { precision: 10, scale: 2 }),
  stock: integer('stock').notNull().default(0),
  weightKg: decimal('weight_kg', { precision: 8, scale: 3 }),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const productImages = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt: text('alt'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
