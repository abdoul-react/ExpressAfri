import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { paymentGateways } from '../../database/schema/payment-gateways';
import { paymentMethods } from '../../database/schema/content-cms';
import { CryptoService } from '../../common/crypto/crypto.service';
import { GatewayRegistryService } from './gateway-registry.service';

/**
 * Configuration des passerelles par l'admin : liste (secrets masqués),
 * mise à jour des clés (chiffrées d'un bloc), test de connexion. Le jour où
 * un contrat PSP est signé, tout se règle ici — aucun déploiement.
 */
@Injectable()
export class GatewaysService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private crypto: CryptoService,
    private registry: GatewayRegistryService,
  ) {}

  async list() {
    const rows = await this.db.select().from(paymentGateways);
    const byCode = new Map(rows.map((r) => [r.code, r]));

    // Méthodes routées par passerelle (pour afficher « traite : Orange Money, Wave »)
    const methods = await this.db
      .select({
        code: paymentMethods.code,
        name: paymentMethods.name,
        gatewayCode: paymentMethods.gatewayCode,
      })
      .from(paymentMethods);

    return this.registry.listAdapters().map((adapter) => {
      const row = byCode.get(adapter.code);
      // Secrets jamais renvoyés en clair : uniquement la présence + un masque
      let maskedCreds: Record<string, string> = {};
      if (row?.credentialsEncrypted) {
        const plain = this.crypto.decrypt(row.credentialsEncrypted);
        if (plain) {
          try {
            const creds = JSON.parse(plain) as Record<string, string>;
            maskedCreds = Object.fromEntries(
              Object.entries(creds).map(([k, v]) => [
                k,
                this.crypto.mask(v) ?? '••••',
              ]),
            );
          } catch {
            /* corrompu : traité comme vide */
          }
        }
      }
      const requiredOk = adapter.credentialKeys.every(
        (k) => maskedCreds[k.key],
      );
      return {
        code: adapter.code,
        label: row?.label ?? adapter.label,
        credentialKeys: adapter.credentialKeys,
        credentials: maskedCreds,
        hasWebhookSecret: !!row?.webhookSecretEncrypted,
        isEnabled: row?.isEnabled ?? false,
        isSandbox: row?.isSandbox ?? true,
        apiEndpoint: row?.apiEndpoint ?? null,
        isConfigured: adapter.credentialKeys.length === 0 || requiredOk,
        supportsTest: !!adapter.testConnection,
        supportsRefund: !!adapter.refund,
        supportsStatusCheck: !!adapter.getStatus,
        routedMethods: methods
          .filter((m) => m.gatewayCode === adapter.code)
          .map((m) => ({ code: m.code, name: m.name })),
      };
    });
  }

  async update(
    code: string,
    body: {
      credentials?: Record<string, string | null>;
      webhookSecret?: string | null;
      isEnabled?: boolean;
      isSandbox?: boolean;
      apiEndpoint?: string | null;
    },
  ) {
    const adapter = this.registry.getAdapter(code);
    if (!adapter) throw new NotFoundException(`Passerelle inconnue : ${code}`);

    const [row] = await this.db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.code, code))
      .limit(1);
    if (!row) throw new NotFoundException(`Passerelle non seedée : ${code}`);

    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (body.credentials !== undefined) {
      // Fusion : champ vide/absent = inchangé, null = effacé, valeur = remplacée.
      // On repart des valeurs déchiffrées existantes pour ne pas perdre les
      // clés que l'admin n'a pas retouchées.
      let current: Record<string, string> = {};
      if (row.credentialsEncrypted) {
        const plain = this.crypto.decrypt(row.credentialsEncrypted);
        if (plain) {
          try {
            current = JSON.parse(plain);
          } catch {
            current = {};
          }
        }
      }
      for (const [k, v] of Object.entries(body.credentials)) {
        if (v === null) delete current[k];
        else if (typeof v === 'string' && v.trim()) current[k] = v.trim();
        // '' ou undefined → clé inchangée
      }
      patch.credentialsEncrypted = Object.keys(current).length
        ? this.crypto.encrypt(JSON.stringify(current))
        : null;
    }

    if (body.webhookSecret !== undefined) {
      patch.webhookSecretEncrypted =
        body.webhookSecret === null || body.webhookSecret === ''
          ? null
          : this.crypto.encrypt(body.webhookSecret);
    }

    if (body.isEnabled !== undefined) patch.isEnabled = !!body.isEnabled;
    if (body.isSandbox !== undefined) patch.isSandbox = !!body.isSandbox;
    if (body.apiEndpoint !== undefined)
      patch.apiEndpoint = body.apiEndpoint?.trim() || null;

    await this.db
      .update(paymentGateways)
      .set(patch)
      .where(eq(paymentGateways.code, code));

    // La prochaine résolution relira la config fraîche
    this.registry.invalidateCache(code);

    return { ok: true };
  }

  async testConnection(code: string) {
    const adapter = this.registry.getAdapter(code);
    if (!adapter) throw new NotFoundException(`Passerelle inconnue : ${code}`);
    if (!adapter.testConnection) {
      return { ok: false, message: 'Test non disponible pour cette passerelle' };
    }

    const [row] = await this.db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.code, code))
      .limit(1);

    let creds: Record<string, string> = {};
    if (row?.credentialsEncrypted) {
      const plain = this.crypto.decrypt(row.credentialsEncrypted);
      if (plain) {
        try {
          creds = JSON.parse(plain);
        } catch {
          creds = {};
        }
      }
    }
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
        isSandbox: row?.isSandbox ?? true,
        apiEndpoint: row?.apiEndpoint ?? null,
      });
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }

  /** Route une méthode du catalogue vers une passerelle (ou la déroute). */
  async routeMethod(methodCode: string, gatewayCode: string | null) {
    if (gatewayCode && !this.registry.getAdapter(gatewayCode)) {
      throw new BadRequestException(`Passerelle inconnue : ${gatewayCode}`);
    }
    const [method] = await this.db
      .update(paymentMethods)
      .set({ gatewayCode, updatedAt: new Date() })
      .where(eq(paymentMethods.code, methodCode))
      .returning({ code: paymentMethods.code });
    if (!method)
      throw new NotFoundException(`Méthode inconnue : ${methodCode}`);
    return { ok: true };
  }
}
