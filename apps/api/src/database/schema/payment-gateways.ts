import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Passerelles de paiement de la PLATEFORME — le « tuyau » qui traite
 * réellement les transactions. À ne pas confondre avec :
 * - `payment_methods` (catalogue) : ce que le client VOIT (Orange Money,
 *   Wave…) ; chaque méthode est routée vers une passerelle via
 *   `payment_methods.gateway_code` ;
 * - `store_payment_methods` : ce que chaque boutique choisit d'afficher.
 *
 * L'admin colle ses clés API ici depuis le back-office ; tant qu'aucune
 * passerelle n'est configurée, seul le paiement à la livraison fonctionne.
 * Les identifiants sont chiffrés d'un bloc (JSON → AES-256-GCM via
 * CryptoService) : jamais de clé en clair en base.
 */
export const paymentGateways = pgTable('payment_gateways', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** cinetpay | paydunya | flutterwave | paystack | stripe |
   *  orange_direct | wave_direct | mtn_direct | mock */
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(false),
  isSandbox: boolean('is_sandbox').notNull().default(true),
  /** JSON { apiKey, apiSecret, merchantId… } chiffré AES-256-GCM. */
  credentialsEncrypted: text('credentials_encrypted'),
  /** Secret de signature des webhooks, chiffré séparément. */
  webhookSecretEncrypted: text('webhook_secret_encrypted'),
  /** Override d'URL (sinon l'adaptateur choisit sandbox/prod lui-même). */
  apiEndpoint: text('api_endpoint'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
