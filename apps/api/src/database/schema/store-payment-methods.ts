import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';

/**
 * Moyens de paiement d'une boutique. Cloisonnés : chaque boutiquier active et
 * configure les siens, sans jamais voir ni toucher ceux d'une autre boutique.
 *
 * `provider` référence le catalogue global `payment_methods` par son `code` :
 * l'admin central décide quels providers existent, le boutiquier décide
 * lesquels il accepte. La contrainte est vérifiée applicativement plutôt que
 * par une clé étrangère, pour qu'un provider retiré du catalogue n'efface pas
 * silencieusement la configuration des boutiques qui l'utilisaient.
 */
export const storePaymentMethods = pgTable(
  'store_payment_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    /** mobile_money | card | wallet | cash_on_delivery */
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    displayName: text('display_name').notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),
    iconUrl: text('icon_url'),
    instructions: text('instructions'),
    countries: text('countries').array().default([]),
    isEnabled: boolean('is_enabled').notNull().default(false),
    isPublic: boolean('is_public').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    metadataPublic: jsonb('metadata_public').notNull().default({}),
    secretRef: text('secret_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex('store_payment_methods_unique').on(
      t.storeId,
      t.provider,
    ),
    storeIdx: index('store_payment_methods_store_idx').on(
      t.storeId,
      t.isEnabled,
      t.sortOrder,
    ),
  }),
);

/**
 * Champs de configuration d'un moyen de paiement, une ligne par clé.
 *
 * `valueEncrypted` et `valuePublic` sont mutuellement exclusifs : un champ est
 * soit sensible (clé API, secret PSP — chiffré au repos, jamais relu par
 * l'API après sauvegarde), soit public (numéro de compte affiché au client).
 */
export const storePaymentMethodConfigs = pgTable(
  'store_payment_method_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storePaymentMethodId: uuid('store_payment_method_id')
      .notNull()
      .references(() => storePaymentMethods.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    valueEncrypted: text('value_encrypted'),
    valuePublic: text('value_public'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex('store_payment_method_configs_unique').on(
      t.storePaymentMethodId,
      t.key,
    ),
  }),
);
