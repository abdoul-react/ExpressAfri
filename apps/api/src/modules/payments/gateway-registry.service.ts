import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { paymentGateways } from '../../database/schema/payment-gateways';
import { paymentMethods } from '../../database/schema/content-cms';
import { CryptoService } from '../../common/crypto/crypto.service';
import type {
  GatewayAdapter,
  GatewayCredentials,
} from './providers/gateway-adapter';

export interface ResolvedGateway {
  adapter: GatewayAdapter;
  creds: GatewayCredentials;
  webhookSecret: string | null;
  isSandbox: boolean;
  apiEndpoint: string | null;
}

/** Entrée de cache : la config passerelle déchiffrée, valable 60 s. */
type CacheEntry = { value: ResolvedGateway; expiresAt: number };
const CACHE_TTL_MS = 60_000;

/**
 * Registre des passerelles de paiement. Deux responsabilités :
 * 1. Tenir la Map code → adaptateur (tous enregistrés au boot, mock compris).
 * 2. Résoudre la passerelle d'une MÉTHODE du catalogue : payment_methods.
 *    gateway_code → payment_gateways (activée + clés déchiffrées).
 *
 * Le refus est la règle : méthode non routée, passerelle désactivée ou clés
 * absentes → erreur claire AVANT tout appel réseau. Tant que l'admin n'a rien
 * configuré, aucun PSP n'est jamais contacté.
 */
@Injectable()
export class GatewayRegistryService {
  private adapters = new Map<string, GatewayAdapter>();
  private cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private crypto: CryptoService,
  ) {}

  register(adapter: GatewayAdapter) {
    this.adapters.set(adapter.code, adapter);
  }

  getAdapter(code: string): GatewayAdapter | undefined {
    return this.adapters.get(code);
  }

  listAdapters(): GatewayAdapter[] {
    return [...this.adapters.values()];
  }

  /** À appeler après toute modification de config passerelle. */
  invalidateCache(code?: string) {
    if (code) this.cache.delete(code);
    else this.cache.clear();
  }

  /** Résout la passerelle configurée pour une passerelle donnée (par code). */
  async resolveGateway(gatewayCode: string): Promise<ResolvedGateway> {
    const cached = this.cache.get(gatewayCode);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const adapter = this.adapters.get(gatewayCode);
    if (!adapter) {
      throw new BadRequestException(
        `Passerelle inconnue : « ${gatewayCode} »`,
      );
    }

    const [row] = await this.db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.code, gatewayCode))
      .limit(1);
    if (!row || !row.isEnabled) {
      throw new ServiceUnavailableException(
        `La passerelle « ${adapter.label} » n'est pas activée`,
      );
    }

    let creds: GatewayCredentials = {};
    if (row.credentialsEncrypted) {
      const plain = this.crypto.decrypt(row.credentialsEncrypted);
      if (plain === null) {
        throw new ServiceUnavailableException(
          `Identifiants de « ${adapter.label} » illisibles — vérifier PAYMENT_ENCRYPTION_KEY`,
        );
      }
      try {
        creds = JSON.parse(plain);
      } catch {
        throw new ServiceUnavailableException(
          `Identifiants de « ${adapter.label} » corrompus`,
        );
      }
    }

    // Toutes les clés requises doivent être présentes (le mock n'en a aucune)
    const missing = adapter.credentialKeys
      .filter((k) => !creds[k.key]?.trim())
      .map((k) => k.label);
    if (missing.length) {
      throw new ServiceUnavailableException(
        `« ${adapter.label} » : configuration incomplète (${missing.join(', ')})`,
      );
    }

    const resolved: ResolvedGateway = {
      adapter,
      creds,
      webhookSecret: row.webhookSecretEncrypted
        ? this.crypto.decrypt(row.webhookSecretEncrypted)
        : null,
      isSandbox: row.isSandbox,
      apiEndpoint: row.apiEndpoint,
    };
    this.cache.set(gatewayCode, {
      value: resolved,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return resolved;
  }

  /** Résout la passerelle qui TRAITE une méthode du catalogue. */
  async resolveForMethod(methodCode: string): Promise<ResolvedGateway> {
    const [method] = await this.db
      .select({ gatewayCode: paymentMethods.gatewayCode })
      .from(paymentMethods)
      .where(eq(paymentMethods.code, methodCode))
      .limit(1);
    if (!method?.gatewayCode) {
      throw new ServiceUnavailableException(
        `La méthode « ${methodCode} » n'est routée vers aucune passerelle — à configurer dans l'admin`,
      );
    }
    return this.resolveGateway(method.gatewayCode);
  }
}
