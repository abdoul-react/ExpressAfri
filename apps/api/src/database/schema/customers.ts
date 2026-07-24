import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { stores } from './stores';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  email: text('email'),
  phone: text('phone'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  gender: text('gender'),
  birthYear: integer('birth_year'),
  // Client bloqué par l'admin : ne peut plus envoyer de messages chat
  chatBlockedAt: timestamp('chat_blocked_at', { withTimezone: true }),
  // Bannissement plateforme : empêche toute connexion mobile
  isBanned: boolean('is_banned').notNull().default(false),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  bannedReason: text('banned_reason'),
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  language: text('language').default('fr'),
  isGuest: boolean('is_guest').default(false),
  totalOrders: integer('total_orders').default(0),
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  label: text('label'),
  contactName: text('contact_name').notNull(),
  phone: text('phone').notNull(),
  street: text('street').notNull(),
  apartment: text('apartment'),
  city: text('city').notNull(),
  province: text('province'),
  postalCode: text('postal_code'),
  countryCode: text('country_code').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Boutiques suivies par un client (un suivi unique par couple client/boutique)
export const storeFollows = pgTable(
  'store_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.customerId, t.storeId)],
);
