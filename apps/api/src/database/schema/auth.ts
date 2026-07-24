import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin']);

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  isSuperAdmin: boolean('is_super_admin').default(false),
  isActive: boolean('is_active').default(true),
  // Gérant de boutique : rattaché à UNE boutique, il ne voit que ses données.
  // FK vers stores(id) posée par migration SQL (référence croisée de modules).
  storeId: uuid('store_id'),
  resetToken: text('reset_token'),
  resetTokenExpiresAt: timestamp('reset_token_expires_at', { withTimezone: true }),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  description: text('description'),
  permissions: text('permissions').array().notNull().default([]),
  isSuperAdmin: boolean('is_super_admin').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
