/**
 * Contrat des adaptateurs de passerelle de paiement.
 *
 * Un adaptateur = un PSP (agrégateur ou API directe opérateur). Il est PUR :
 * aucun accès base, aucune configuration propre — les identifiants déchiffrés
 * lui sont passés à chaque appel par le GatewayRegistry. Ajouter un PSP =
 * écrire un fichier dans adapters/ et l'enregistrer dans le module ; l'admin
 * fait le reste depuis le back-office.
 */

export type GatewayCredentials = Record<string, string>;

export interface GatewayCredentialKey {
  key: string;
  label: string;
  /** true → input password + chiffrement (déjà le cas de tout le bloc). */
  secret: boolean;
  /** Aide affichée sous le champ dans l'admin. */
  hint?: string;
}

export interface GatewayInitializeInput {
  paymentId: string;
  amount: string;
  currency: string;
  /** Code catalogue de la méthode (orange_money, wave, card…). */
  method: string;
  /** Numéro Mobile Money du payeur, indicatif inclus. */
  phoneNumber?: string;
  /** Deep link de retour vers l'app après paiement chez le PSP. */
  returnUrl?: string;
  /** URL de notification serveur (webhook) attendue par certains PSP. */
  notifyUrl?: string;
  isSandbox: boolean;
  /** Override d'endpoint posé par l'admin (sinon l'adaptateur choisit). */
  apiEndpoint?: string | null;
}

export interface GatewayInitializeResult {
  providerPaymentId: string;
  /** Page de paiement hébergée chez le PSP — le mobile l'ouvre. */
  checkoutUrl?: string;
  status: 'pending' | 'authorized';
  /** Réponse brute du PSP, stockée dans payments.gateway_response (debug). */
  raw?: unknown;
}

export type GatewayWebhookStatus =
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded';

export interface GatewayWebhookEvent {
  eventId: string;
  providerPaymentId: string;
  status: GatewayWebhookStatus;
}

export interface GatewayAdapter {
  readonly code: string;
  readonly label: string;
  /** Clés attendues — pilote le formulaire de configuration admin. */
  readonly credentialKeys: GatewayCredentialKey[];

  initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult>;

  /**
   * Vérifie la signature du webhook sur les OCTETS BRUTS du corps. Chaque PSP
   * signe différemment : le header pertinent est extrait de `headers` par
   * l'adaptateur lui-même. `webhookSecret` vient de la config passerelle.
   */
  verifyWebhook(
    creds: GatewayCredentials,
    webhookSecret: string | null,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean;

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent;

  /** Interrogation active du statut (PSP sans webhook fiable : MTN MoMo…). */
  getStatus?(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'>;

  /** Remboursement côté PSP quand l'API le permet. */
  refund?(
    creds: GatewayCredentials,
    providerPaymentId: string,
    amount: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ refundId: string; status: 'pending' | 'done' }>;

  /** Ping authentifié léger — bouton « Tester la connexion » de l'admin. */
  testConnection?(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }>;
}
