import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { admins } from './auth';

export const adminTickets = pgTable('admin_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: text('customer_id'),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  subject: text('subject').notNull(),
  lastMessage: text('last_message'),
  status: text('status', {
    enum: ['open', 'in_progress', 'resolved', 'closed'],
  })
    .notNull()
    .default('open'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] })
    .notNull()
    .default('medium'),
  assignedTo: uuid('assigned_to').references(() => admins.id),
  unread: boolean('unread').default(true),
  messageCount: integer('message_count').default(0),
  chatConversationId: uuid('chat_conversation_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => adminTickets.id),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  senderType: text('sender_type', { enum: ['customer', 'admin'] }).notNull(),
  content: text('content').notNull(),
  attachments: jsonb('attachments')
    .$type<{ name: string; url: string }[]>()
    .default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const internalMessages = pgTable('internal_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromAdminId: uuid('from_admin_id').notNull(),
  fromAdminName: text('from_admin_name').notNull(),
  toAdminId: uuid('to_admin_id').notNull(),
  toAdminName: text('to_admin_name').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  thread: jsonb('thread')
    .$type<
      {
        id: string;
        fromAdminId: string;
        fromAdminName: string;
        content: string;
        createdAt: string;
      }[]
    >()
    .default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
