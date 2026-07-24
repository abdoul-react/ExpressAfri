import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { stores } from './stores';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  orderId: text('order_id'),
  subject: text('subject'),
  status: text('status', { enum: ['open', 'closed', 'pending'] })
    .notNull()
    .default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id),
  senderId: text('sender_id').notNull(),
  senderRole: text('sender_role', { enum: ['customer', 'admin', 'seller'] })
    .notNull()
    .default('customer'),
  // Type de message : texte simple, ou pièce jointe (image/vidéo/pdf/audio, accompagnée d'un texte optionnel)
  type: text('type', { enum: ['text', 'image', 'video', 'pdf', 'audio'] })
    .notNull()
    .default('text'),
  content: text('content').notNull().default(''),
  // Pièce jointe : URL servie via /uploads + nom d'origine (affiché pour les PDF)
  attachmentUrl: text('attachment_url'),
  attachmentName: text('attachment_name'),
  // Réponse à un message précédent (fil de discussion façon WhatsApp)
  replyToId: uuid('reply_to_id'),
  // Suppression pour tous : le contenu est masqué mais la ligne conservée
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
