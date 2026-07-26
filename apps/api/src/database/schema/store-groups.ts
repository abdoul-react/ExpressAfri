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

/**
 * Sections de la LISTE des boutiques — la vitrine de la marketplace.
 *
 * À ne pas confondre avec `storeSections` (store-sections.ts), qui regroupe des
 * produits *dans* une boutique et appartient au boutiquier. Ici on regroupe des
 * *boutiques* par thème (« Vêtements homme », « Électronique »). Ces sections
 * sont transverses, n'ont donc pas de `storeId`, et relèvent de l'admin central
 * seul : un gérant de boutique ne doit jamais pouvoir les modifier.
 */
export const storeGroups = pgTable(
  'store_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    activeIdx: index('store_groups_active_idx').on(t.isActive, t.sortOrder),
  }),
);

/** Boutiques affectées à une section, dans l'ordre voulu par l'admin. */
export const storeGroupItems = pgTable(
  'store_group_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => storeGroups.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex('store_group_items_unique').on(t.groupId, t.storeId),
    groupIdx: index('store_group_items_group_idx').on(t.groupId, t.sortOrder),
    storeIdx: index('store_group_items_store_idx').on(t.storeId),
  }),
);
