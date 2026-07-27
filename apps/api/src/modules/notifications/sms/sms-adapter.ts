/**
 * Contrat des adaptateurs SMS — même philosophie que GatewayAdapter côté
 * paiements : l'adaptateur est pur, les identifiants déchiffrés lui sont
 * passés à chaque appel. Ajouter un fournisseur = un fichier + une ligne
 * d'enregistrement ; l'admin fait le reste depuis le back-office.
 */

export type SmsCredentials = Record<string, string>;

export interface SmsCredentialKey {
  key: string;
  label: string;
  secret: boolean;
  hint?: string;
}

export interface SmsSendInput {
  /** Numéro E.164 (+22790000000). */
  to: string;
  message: string;
  /** Sender ID configuré par l'admin (soumis à enregistrement par pays). */
  senderId?: string | null;
  apiEndpoint?: string | null;
}

export interface SmsAdapter {
  readonly code: string;
  readonly label: string;
  readonly credentialKeys: SmsCredentialKey[];

  send(creds: SmsCredentials, input: SmsSendInput): Promise<{ ok: boolean; providerId?: string; message?: string }>;

  /** Ping authentifié léger — bouton « Tester la connexion » de l'admin. */
  testConnection?(
    creds: SmsCredentials,
    ctx: { apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }>;
}
