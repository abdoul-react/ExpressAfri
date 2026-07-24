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
import { orders } from './orders';

export const deliveryPersons = pgTable('delivery_persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .references(() => stores.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  vehicleType: text('vehicle_type').notNull().default('bike'),
  countryCode: text('country_code'),
  countryName: text('country_name'),
  region: text('region'),
  address: text('address'),
  idCardNumber: text('id_card_number'),
  licensePlate: text('license_plate'),
  profilePhoto: text('profile_photo'),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  ratingCount: integer('rating_count').default(0),
  totalDeliveries: integer('total_deliveries').default(0),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const deliveryAssignments = pgTable('delivery_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  deliveryPersonId: uuid('delivery_person_id')
    .notNull()
    .references(() => deliveryPersons.id),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  status: text('status').notNull().default('assigned'),
  notes: text('notes'),
  rating: integer('rating'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  pickedUpAt: timestamp('picked_up_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
