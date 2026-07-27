import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { smsGateways } from '../../../database/schema/sms-gateways';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { AppLoggerService } from '../../../common/logger/logger.service';
import type { SmsAdapter, SmsCredentials } from './sms-adapter';

type CacheEntry = {
  value: { adapter: SmsAdapter; creds: SmsCredentials; senderId: string | null; apiEndpoint: string | null } | null;
  expiresAt: number;
};
const CACHE_TTL_MS = 60_000;

/**
 * Service d'envoi SMS de la plateforme. Le fournisseur ACTIF est celui que
 * l'admin a activé (un seul à la fois — le premier activé gagne) ; sans
 * fournisseur configuré, l'envoi est ignoré sans erreur : l'app reste
 * fonctionnelle en dev, et l'OTP est déjà couvert par le repli existant.
 */
@Injectable()
export class SmsService {
  private adapters = new Map<string, SmsAdapter>();
  private activeCache: CacheEntry | null = null;

  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private crypto: CryptoService,
    private logger: AppLoggerService,
  ) {}

  register(adapter: SmsAdapter) {
    this.adapters.set(adapter.code, adapter);
  }

  getAdapter(code: string): SmsAdapter | undefined {
    return this.adapters.get(code);
  }

  listAdapters(): SmsAdapter[] {
    return [...this.adapters.values()];
  }

  invalidateCache() {
    this.activeCache = null;
  }

  private decryptCreds(encrypted: string | null): SmsCredentials {
    if (!encrypted) return {};
    const plain = this.crypto.decrypt(encrypted);
    if (!plain) return {};
    try {
      return JSON.parse(plain);
    } catch {
      return {};
    }
  }

  /** Fournisseur actif (clés complètes) ou null si rien n'est configuré. */
  private async resolveActive() {
    if (this.activeCache && this.activeCache.expiresAt > Date.now()) {
      return this.activeCache.value;
    }
    const rows = await this.db
      .select()
      .from(smsGateways)
      .where(eq(smsGateways.isEnabled, true));
    let value: CacheEntry['value'] = null;
    for (const row of rows) {
      const adapter = this.adapters.get(row.code);
      if (!adapter) continue;
      const creds = this.decryptCreds(row.credentialsEncrypted);
      const complete = adapter.credentialKeys.every((k) =>
        creds[k.key]?.trim(),
      );
      if (!complete) continue;
      value = {
        adapter,
        creds,
        senderId: row.senderId,
        apiEndpoint: row.apiEndpoint,
      };
      break;
    }
    this.activeCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  /**
   * Envoi best-effort : `false` = aucun fournisseur actif ou échec d'envoi.
   * Ne lève JAMAIS — un SMS qui échoue ne doit pas casser une inscription.
   */
  async send(to: string, message: string): Promise<boolean> {
    const active = await this.resolveActive();
    if (!active) return false;
    try {
      const result = await active.adapter.send(active.creds, {
        to,
        message,
        senderId: active.senderId,
        apiEndpoint: active.apiEndpoint,
      });
      if (!result.ok) {
        this.logger.warn(
          `SMS ${active.adapter.code} → échec : ${result.message ?? '?'}`,
        );
      }
      return result.ok;
    } catch (e) {
      this.logger.warn(
        `SMS ${active.adapter.code} → erreur : ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  // ── Configuration admin (miroir de GatewaysService) ──

  async listForAdmin() {
    const rows = await this.db.select().from(smsGateways);
    const byCode = new Map(rows.map((r) => [r.code, r]));
    return this.listAdapters().map((adapter) => {
      const row = byCode.get(adapter.code);
      const creds = this.decryptCreds(row?.credentialsEncrypted ?? null);
      const maskedCreds = Object.fromEntries(
        Object.entries(creds).map(([k, v]) => [
          k,
          this.crypto.mask(v) ?? '••••',
        ]),
      );
      const requiredOk = adapter.credentialKeys.every((k) => maskedCreds[k.key]);
      return {
        code: adapter.code,
        label: row?.label ?? adapter.label,
        credentialKeys: adapter.credentialKeys,
        credentials: maskedCreds,
        senderId: row?.senderId ?? null,
        apiEndpoint: row?.apiEndpoint ?? null,
        isEnabled: row?.isEnabled ?? false,
        isConfigured: adapter.credentialKeys.length === 0 || requiredOk,
        supportsTest: !!adapter.testConnection,
      };
    });
  }

  async update(
    code: string,
    body: {
      credentials?: Record<string, string | null>;
      senderId?: string | null;
      apiEndpoint?: string | null;
      isEnabled?: boolean;
    },
  ) {
    const adapter = this.adapters.get(code);
    if (!adapter) throw new NotFoundException(`Fournisseur inconnu : ${code}`);
    const [row] = await this.db
      .select()
      .from(smsGateways)
      .where(eq(smsGateways.code, code))
      .limit(1);
    if (!row) throw new NotFoundException(`Fournisseur non seedé : ${code}`);

    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (body.credentials !== undefined) {
      // Fusion : vide = inchangé, null = effacé, valeur = remplacée
      const current = this.decryptCreds(row.credentialsEncrypted);
      for (const [k, v] of Object.entries(body.credentials)) {
        if (v === null) delete current[k];
        else if (typeof v === 'string' && v.trim()) current[k] = v.trim();
      }
      patch.credentialsEncrypted = Object.keys(current).length
        ? this.crypto.encrypt(JSON.stringify(current))
        : null;
    }
    if (body.senderId !== undefined)
      patch.senderId = body.senderId?.trim() || null;
    if (body.apiEndpoint !== undefined)
      patch.apiEndpoint = body.apiEndpoint?.trim() || null;
    if (body.isEnabled !== undefined) {
      patch.isEnabled = !!body.isEnabled;
      // Un seul fournisseur actif : activer celui-ci désactive les autres
      if (body.isEnabled) {
        await this.db
          .update(smsGateways)
          .set({ isEnabled: false, updatedAt: new Date() });
      }
    }

    await this.db
      .update(smsGateways)
      .set(patch)
      .where(eq(smsGateways.code, code));
    this.invalidateCache();
    return { ok: true };
  }

  async testConnection(code: string) {
    const adapter = this.adapters.get(code);
    if (!adapter) throw new NotFoundException(`Fournisseur inconnu : ${code}`);
    if (!adapter.testConnection) {
      return { ok: false, message: 'Test non disponible' };
    }
    const [row] = await this.db
      .select()
      .from(smsGateways)
      .where(eq(smsGateways.code, code))
      .limit(1);
    const creds = this.decryptCreds(row?.credentialsEncrypted ?? null);
    const missing = adapter.credentialKeys
      .filter((k) => !creds[k.key]?.trim())
      .map((k) => k.label);
    if (missing.length) {
      return {
        ok: false,
        message: `Configuration incomplète : ${missing.join(', ')}`,
      };
    }
    try {
      return await adapter.testConnection(creds, {
        apiEndpoint: row?.apiEndpoint ?? null,
      });
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
