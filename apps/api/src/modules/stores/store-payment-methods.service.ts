import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  storePaymentMethods,
  storePaymentMethodConfigs,
} from '../../database/schema/store-payment-methods';
import { paymentMethods } from '../../database/schema/content-cms';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuditService } from '../audit/audit.service';

/** Types de paiement reconnus (§22 du plan de refonte). */
const TYPES = ['mobile_money', 'card', 'wallet', 'cash_on_delivery'] as const;

/**
 * Le catalogue historique abrège certains types ('cod'). Sans cette table, un
 * provider parfaitement valide du catalogue serait refusé à l'activation.
 */
const TYPE_ALIASES: Record<string, (typeof TYPES)[number]> = {
  cod: 'cash_on_delivery',
  cash: 'cash_on_delivery',
  mobile: 'mobile_money',
};

/**
 * Clés de configuration considérées comme sensibles : chiffrées au repos et
 * jamais renvoyées par l'API après sauvegarde. Tout ce qui n'est pas dans cette
 * liste est traité comme public, donc lisible par le boutiquier.
 */
const SECRET_KEYS = new Set([
  'apiKey',
  'apiSecret',
  'privateKey',
  'merchantSecret',
  'webhookSecret',
  'password',
  'token',
]);

type MethodInput = {
  provider?: string;
  type?: string;
  displayName?: string;
  description?: string | null;
  logoUrl?: string | null;
  iconUrl?: string | null;
  instructions?: string | null;
  countries?: string[];
  isEnabled?: boolean;
  isPublic?: boolean;
  metadataPublic?: Record<string, unknown>;
  config?: Record<string, string | null>;
};

/**
 * Moyens de paiement d'une boutique — cloisonnés par `storeId`.
 *
 * Toutes les méthodes prennent le `storeId` en premier argument et le
 * réappliquent dans le `WHERE` même lorsqu'un `methodId` est fourni : un id
 * valide appartenant à une autre boutique doit se comporter comme un id
 * inexistant, jamais comme un accès accordé.
 *
 * L'admin central ne configure rien ici : il alimente le catalogue global
 * `payment_methods`, qui borne les providers que le boutiquier peut activer.
 */
@Injectable()
export class StorePaymentMethodsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private crypto: CryptoService,
    private audit: AuditService,
  ) {}

  /** Providers que l'admin central met à disposition des boutiques. */
  async catalog() {
    const rows = await this.db
      .select({
        code: paymentMethods.code,
        name: paymentMethods.name,
        description: paymentMethods.description,
        logoUrl: paymentMethods.logoUrl,
        type: paymentMethods.type,
        supportedCountries: paymentMethods.supportedCountries,
      })
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.position);
    return rows.map((r) => ({
      ...r,
      // Le catalogue historique utilise des tirets ('mobile-money') et des
      // abréviations ('cod'), le modèle par boutique des underscores complets.
      // On normalise ici plutôt que d'imposer au client de connaître les deux
      // conventions.
      type: this.safeType(r.type),
    }));
  }

  /** Comme `normalizeType`, mais sans lever : un catalogue mal renseigné ne
   *  doit pas rendre la liste des providers inaccessible. */
  private safeType(type: string | null) {
    const value = type?.replace(/-/g, '_') ?? '';
    const resolved = TYPE_ALIASES[value] ?? value;
    return TYPES.includes(resolved as any) ? resolved : 'wallet';
  }

  async list(storeId: string) {
    const rows = await this.db
      .select()
      .from(storePaymentMethods)
      .where(eq(storePaymentMethods.storeId, storeId))
      .orderBy(asc(storePaymentMethods.sortOrder));
    if (!rows.length) return [];

    const configs = await this.db
      .select()
      .from(storePaymentMethodConfigs)
      .where(
        inArray(
          storePaymentMethodConfigs.storePaymentMethodId,
          rows.map((r) => r.id),
        ),
      );

    return rows.map((row) => this.toDto(row, configs));
  }

  async getOne(storeId: string, methodId: string) {
    const [row] = await this.db
      .select()
      .from(storePaymentMethods)
      .where(
        and(
          eq(storePaymentMethods.id, methodId),
          eq(storePaymentMethods.storeId, storeId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Moyen de paiement introuvable');
    const configs = await this.db
      .select()
      .from(storePaymentMethodConfigs)
      .where(eq(storePaymentMethodConfigs.storePaymentMethodId, methodId));
    return this.toDto(row, configs);
  }

  async create(storeId: string, input: MethodInput, actor?: any) {
    const provider = input.provider?.trim();
    if (!provider) throw new BadRequestException('Provider requis');

    const allowed = await this.catalog();
    const entry = allowed.find((c) => c.code === provider);
    if (!entry) {
      throw new BadRequestException(
        "Ce provider n'est pas proposé par la plateforme",
      );
    }

    const type = this.normalizeType(input.type ?? entry.type);
    const [{ maxOrder }] = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)::int` })
      .from(storePaymentMethods)
      .where(eq(storePaymentMethods.storeId, storeId));

    let created;
    try {
      [created] = await this.db
        .insert(storePaymentMethods)
        .values({
          storeId,
          provider,
          type,
          displayName: input.displayName?.trim() || entry.name,
          description: input.description?.trim() || null,
          logoUrl: input.logoUrl?.trim() || entry.logoUrl || null,
          iconUrl: input.iconUrl?.trim() || null,
          instructions: input.instructions?.trim() || null,
          countries: input.countries ?? entry.supportedCountries ?? [],
          isEnabled: input.isEnabled ?? false,
          isPublic: input.isPublic ?? true,
          sortOrder: Number(maxOrder ?? -1) + 1,
          metadataPublic: input.metadataPublic ?? {},
        })
        .returning();
    } catch (e: any) {
      // Index unique (store_id, provider) : le message brut de Postgres
      // n'aiderait pas le boutiquier.
      if (String(e?.code) === '23505') {
        throw new BadRequestException(
          'Ce provider est déjà configuré pour cette boutique',
        );
      }
      throw e;
    }

    if (input.config) await this.writeConfig(created.id, input.config);
    await this.log('payment_method.create', storeId, created.id, actor, {
      provider,
      type,
    });
    return this.getOne(storeId, created.id);
  }

  async update(
    storeId: string,
    methodId: string,
    input: MethodInput,
    actor?: any,
  ) {
    // Vérifie l'appartenance avant toute écriture.
    await this.getOne(storeId, methodId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.displayName !== undefined) {
      if (!input.displayName.trim())
        throw new BadRequestException('Nom visible requis');
      patch.displayName = input.displayName.trim();
    }
    if (input.type !== undefined) patch.type = this.normalizeType(input.type);
    if (input.description !== undefined)
      patch.description = input.description?.trim() || null;
    if (input.logoUrl !== undefined)
      patch.logoUrl = input.logoUrl?.trim() || null;
    if (input.iconUrl !== undefined)
      patch.iconUrl = input.iconUrl?.trim() || null;
    if (input.instructions !== undefined)
      patch.instructions = input.instructions?.trim() || null;
    if (input.countries !== undefined) patch.countries = input.countries;
    if (input.isEnabled !== undefined) patch.isEnabled = input.isEnabled;
    if (input.isPublic !== undefined) patch.isPublic = input.isPublic;
    if (input.metadataPublic !== undefined)
      patch.metadataPublic = input.metadataPublic;

    await this.db
      .update(storePaymentMethods)
      .set(patch)
      .where(
        and(
          eq(storePaymentMethods.id, methodId),
          eq(storePaymentMethods.storeId, storeId),
        ),
      );

    if (input.config) await this.writeConfig(methodId, input.config);
    await this.log('payment_method.update', storeId, methodId, actor, {
      fields: Object.keys(patch).filter((k) => k !== 'updatedAt'),
      configKeys: input.config ? Object.keys(input.config) : [],
    });
    return this.getOne(storeId, methodId);
  }

  async remove(storeId: string, methodId: string, actor?: any) {
    const [deleted] = await this.db
      .delete(storePaymentMethods)
      .where(
        and(
          eq(storePaymentMethods.id, methodId),
          eq(storePaymentMethods.storeId, storeId),
        ),
      )
      .returning({
        id: storePaymentMethods.id,
        provider: storePaymentMethods.provider,
      });
    if (!deleted) throw new NotFoundException('Moyen de paiement introuvable');
    await this.log('payment_method.delete', storeId, methodId, actor, {
      provider: deleted.provider,
    });
    return { ok: true };
  }

  async reorder(storeId: string, ids: string[]) {
    if (!ids.length) return { ok: true };
    await Promise.all(
      ids.map((id, index) =>
        this.db
          .update(storePaymentMethods)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(storePaymentMethods.id, id),
              eq(storePaymentMethods.storeId, storeId),
            ),
          ),
      ),
    );
    return { ok: true };
  }

  /**
   * Contrôle de complétude : signale les clés sensibles attendues qui n'ont
   * jamais été saisies. Ne contacte pas le PSP — un vrai appel sortant
   * dépendrait d'un SDK par provider, hors périmètre ici.
   */
  async validate(storeId: string, methodId: string, actor?: any) {
    const method = await this.getOne(storeId, methodId);
    const required =
      method.type === 'cash_on_delivery' ? [] : ['apiKey', 'apiSecret'];
    const missing = required.filter((k) => !method.secrets[k]);
    const ok = missing.length === 0;
    await this.log('payment_method.validate', storeId, methodId, actor, {
      provider: method.provider,
      ok,
      missing,
    });
    return {
      ok,
      missing,
      message: ok
        ? 'Configuration complète'
        : `Champs sensibles manquants : ${missing.join(', ')}`,
    };
  }

  /**
   * Vue client : uniquement les méthodes activées et publiques, sans aucune
   * donnée de configuration. Filtrée sur le pays de livraison quand la méthode
   * en déclare — une liste `countries` vide vaut « tous pays ».
   */
  async listPublic(storeId: string, country?: string) {
    const rows = await this.db
      .select({
        id: storePaymentMethods.id,
        type: storePaymentMethods.type,
        provider: storePaymentMethods.provider,
        displayName: storePaymentMethods.displayName,
        description: storePaymentMethods.description,
        logoUrl: storePaymentMethods.logoUrl,
        iconUrl: storePaymentMethods.iconUrl,
        instructions: storePaymentMethods.instructions,
        countries: storePaymentMethods.countries,
        metadataPublic: storePaymentMethods.metadataPublic,
      })
      .from(storePaymentMethods)
      .where(
        and(
          eq(storePaymentMethods.storeId, storeId),
          eq(storePaymentMethods.isEnabled, true),
          eq(storePaymentMethods.isPublic, true),
        ),
      )
      .orderBy(asc(storePaymentMethods.sortOrder));

    return rows
      .filter(
        (r) =>
          !country || !r.countries?.length || r.countries.includes(country),
      )
      .map(({ countries: _c, ...rest }) => rest);
  }

  private normalizeType(type: string) {
    const value = type?.replace(/-/g, '_');
    const resolved = TYPE_ALIASES[value] ?? value;
    if (!TYPES.includes(resolved as any)) {
      throw new BadRequestException(`Type de paiement inconnu : ${type}`);
    }
    return resolved;
  }

  /**
   * Écrit les champs de configuration. Une valeur `null` supprime la clé —
   * c'est le seul moyen de retirer un secret, puisqu'on ne peut pas le relire
   * pour le comparer.
   */
  private async writeConfig(
    methodId: string,
    config: Record<string, string | null>,
  ) {
    for (const [key, value] of Object.entries(config)) {
      if (value === null || value === '') {
        await this.db
          .delete(storePaymentMethodConfigs)
          .where(
            and(
              eq(storePaymentMethodConfigs.storePaymentMethodId, methodId),
              eq(storePaymentMethodConfigs.key, key),
            ),
          );
        continue;
      }
      const secret = SECRET_KEYS.has(key);
      await this.db
        .insert(storePaymentMethodConfigs)
        .values({
          storePaymentMethodId: methodId,
          key,
          valueEncrypted: secret ? this.crypto.encrypt(value) : null,
          valuePublic: secret ? null : value,
        })
        .onConflictDoUpdate({
          target: [
            storePaymentMethodConfigs.storePaymentMethodId,
            storePaymentMethodConfigs.key,
          ],
          set: {
            valueEncrypted: secret ? this.crypto.encrypt(value) : null,
            valuePublic: secret ? null : value,
            updatedAt: new Date(),
          },
        });
    }

    // `secretRef` matérialise l'existence d'au moins un secret, sans jamais
    // porter la valeur : c'est ce que lit le checkout pour savoir si la
    // méthode est exploitable.
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(storePaymentMethodConfigs)
      .where(
        and(
          eq(storePaymentMethodConfigs.storePaymentMethodId, methodId),
          sql`${storePaymentMethodConfigs.valueEncrypted} is not null`,
        ),
      );
    await this.db
      .update(storePaymentMethods)
      .set({
        secretRef: Number(count) > 0 ? `db:${methodId}` : null,
        updatedAt: new Date(),
      })
      .where(eq(storePaymentMethods.id, methodId));
  }

  /**
   * Projection sortante. Les valeurs chiffrées ne sortent jamais telles
   * quelles : `secrets` ne porte qu'un aperçu masqué, suffisant pour que le
   * boutiquier sache qu'une clé est renseignée sans pouvoir la relire.
   */
  private toDto(row: any, configs: any[]) {
    const mine = configs.filter((c) => c.storePaymentMethodId === row.id);
    const publicConfig: Record<string, string> = {};
    const secrets: Record<string, string> = {};
    for (const c of mine) {
      if (c.valueEncrypted) {
        secrets[c.key] = this.crypto.mask(this.crypto.decrypt(c.valueEncrypted)) ?? '••••';
      } else if (c.valuePublic !== null) {
        publicConfig[c.key] = c.valuePublic;
      }
    }
    const { secretRef: _ref, ...rest } = row;
    return { ...rest, config: publicConfig, secrets };
  }

  private async log(
    action: string,
    storeId: string,
    methodId: string,
    actor: any,
    details: Record<string, unknown>,
  ) {
    // L'audit ne doit jamais faire échouer l'opération métier qu'il trace.
    try {
      await this.audit.create({
        action,
        resource: 'store_payment_method',
        resourceId: methodId,
        actorId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        details: { storeId, ...details },
        status: 'success',
      });
    } catch {
      /* ignoré volontairement */
    }
  }
}
