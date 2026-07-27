import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Fournisseurs SMS de la plateforme — même modèle que payment_gateways :
 * l'admin colle ses clés (chiffrées AES-256-GCM) et active UN fournisseur ;
 * l'OTP part par SMS dès qu'il est configuré. Sans fournisseur : l'envoi est
 * ignoré (dev) — le code reste vérifiable via les logs de debug locaux.
 */
export const smsGateways = pgTable('sms_gateways', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** twilio | africas_talking | orange_sms | sms_mock */
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(false),
  /** JSON { accountSid, authToken… } chiffré AES-256-GCM. */
  credentialsEncrypted: text('credentials_encrypted'),
  /** Nom d'expéditeur affiché sur le téléphone (sender ID). */
  senderId: text('sender_id'),
  apiEndpoint: text('api_endpoint'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
