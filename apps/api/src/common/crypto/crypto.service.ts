import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

/** Marqueur de format : permet de faire évoluer l'algorithme sans ambiguïté. */
const PREFIX = 'v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Chiffrement symétrique des secrets stockés en base (clés API PSP, secrets
 * marchands…). AES-256-GCM : l'authentification intégrée garantit qu'une valeur
 * altérée en base est rejetée au déchiffrement plutôt que silencieusement
 * interprétée.
 *
 * La clé est dérivée par scrypt d'un secret d'environnement. `JWT_SECRET` sert
 * de repli pour ne pas bloquer les environnements de développement, mais un
 * `PAYMENT_ENCRYPTION_KEY` distinct doit être défini en production : faire
 * tourner le secret JWT ne doit pas rendre les secrets PSP illisibles.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private cachedKey: Buffer | null = null;

  constructor(private config: ConfigService) {}

  private get key(): Buffer {
    if (this.cachedKey) return this.cachedKey;
    const secret =
      this.config.get<string>('PAYMENT_ENCRYPTION_KEY') ||
      this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'PAYMENT_ENCRYPTION_KEY (ou à défaut JWT_SECRET) est requis pour chiffrer les secrets',
      );
    }
    if (!this.config.get<string>('PAYMENT_ENCRYPTION_KEY')) {
      this.logger.warn(
        'PAYMENT_ENCRYPTION_KEY absent : repli sur JWT_SECRET. À définir en production.',
      );
    }
    // Sel fixe : la dérivation doit être reproductible d'un démarrage à
    // l'autre, sinon les valeurs déjà en base deviendraient indéchiffrables.
    this.cachedKey = scryptSync(secret, 'expressafri.payments', 32);
    return this.cachedKey;
  }

  /** Renvoie `v1:iv:tag:ciphertext`, tout en base64url. */
  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    return [
      PREFIX,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      enc.toString('base64url'),
    ].join(':');
  }

  /** Renvoie `null` si la valeur est illisible : jamais d'exception en lecture. */
  decrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== PREFIX) return null;
    try {
      const iv = Buffer.from(parts[1], 'base64url');
      const tag = Buffer.from(parts[2], 'base64url');
      if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
      const decipher = createDecipheriv(ALGO, this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(parts[3], 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      this.logger.warn('Secret indéchiffrable : clé changée ou donnée altérée');
      return null;
    }
  }

  /**
   * Aperçu non réversible destiné à l'affichage : `••••1234`. Les secrets trop
   * courts sont entièrement masqués — montrer 4 caractères sur 6 reviendrait à
   * livrer le secret.
   */
  mask(plain: string | null | undefined): string | null {
    if (!plain) return null;
    if (plain.length <= 8) return '••••';
    return `••••${plain.slice(-4)}`;
  }
}
