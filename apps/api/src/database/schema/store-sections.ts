import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { products } from './products';

/**
 * Sections de catalogue d'une boutique. Cloisonnées par boutique : chaque
 * boutiquier crée ses propres sections, jamais partagées avec une autre.
 * `layout` pilote le format des cartes produit côté mobile.
 */
export const storeSections = pgTable(
  'store_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    /** grid | rail | list | showcase */
    layout: text('layout').notNull().default('grid'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    storeIdx: index('store_sections_store_idx').on(
      t.storeId,
      t.isActive,
      t.sortOrder,
    ),
  }),
);

/** Produits affectés à une section, dans l'ordre voulu par le boutiquier. */
export const storeSectionItems = pgTable(
  'store_section_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => storeSections.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex('store_section_items_unique').on(
      t.sectionId,
      t.productId,
    ),
    sectionIdx: index('store_section_items_section_idx').on(
      t.sectionId,
      t.sortOrder,
    ),
  }),
);
