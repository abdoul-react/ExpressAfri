import { and, eq, inArray, isNull, or, desc } from 'drizzle-orm';
import type { DrizzleDB } from '../../database/database.module';
import { shippingZones, shippingMethods } from '../../database/schema/shipping';
import { appSettings } from '../../database/schema/settings';

export interface StoreShippingQuote {
  shippingCost: number;
  freeThreshold: number | null;
  isFree: boolean;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  source: 'store-zone' | 'zone' | 'global';
  zoneName: string | null;
}

/**
 * Devis de livraison pour UNE boutique — LA source unique de vérité, utilisée
 * à la fois par l'endpoint de devis (/mobile/checkout/shipping-quotes) et par
 * la création de commande. Tout écart entre les deux ferait diverger le total
 * affiché du total facturé.
 *
 * Résolution :
 * 1. Zones actives couvrant le pays : celles de la boutique d'abord, puis les
 *    zones globales de la plateforme (storeId NULL), priorité décroissante.
 * 2. Méthode active la moins chère de la zone retenue — celle de la boutique
 *    ou une méthode plateforme. Le seuil de gratuité s'applique au sous-total
 *    de CETTE boutique (chaque boutique expédie séparément).
 * 3. Aucune zone/méthode : repli sur les réglages globaux
 *    commerce.baseShippingFee / commerce.freeShippingThreshold.
 */
export async function quoteStoreShipping(
  db: DrizzleDB,
  input: { storeId: string; country?: string; subtotal?: number },
): Promise<StoreShippingQuote> {
  const subtotal = Number.isFinite(input.subtotal) ? Number(input.subtotal) : 0;
  const country = (input.country ?? '').trim().toUpperCase();

  if (country) {
    const zones = await db
      .select()
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.isActive, true),
          or(
            eq(shippingZones.storeId, input.storeId),
            isNull(shippingZones.storeId),
          ),
        ),
      )
      .orderBy(desc(shippingZones.priority));

    // Une zone de la boutique prime sur une zone plateforme de même priorité
    const ordered = zones
      .slice()
      .sort((a, b) =>
        a.storeId === b.storeId ? 0 : a.storeId === input.storeId ? -1 : 1,
      );
    const zone = ordered.find((z) => {
      const list = Array.isArray(z.countries) ? z.countries : [];
      return list.some(
        (c) => typeof c === 'string' && c.toUpperCase() === country,
      );
    });

    if (zone) {
      const methods = await db
        .select()
        .from(shippingMethods)
        .where(
          and(
            eq(shippingMethods.zoneId, zone.id),
            eq(shippingMethods.isActive, true),
            or(
              eq(shippingMethods.storeId, input.storeId),
              isNull(shippingMethods.storeId),
            ),
          ),
        );
      // Méthode la moins chère (baseRate est un decimal → string)
      const method = methods
        .slice()
        .sort((a, b) => Number(a.baseRate) - Number(b.baseRate))[0];
      if (method) {
        const baseRate = Number(method.baseRate) || 0;
        const freeThreshold =
          method.freeThreshold != null ? Number(method.freeThreshold) : null;
        const isFree = freeThreshold != null && subtotal >= freeThreshold;
        return {
          shippingCost: isFree ? 0 : baseRate,
          freeThreshold,
          isFree,
          estimatedDaysMin: method.estimatedDaysMin ?? 1,
          estimatedDaysMax: method.estimatedDaysMax ?? 7,
          source: zone.storeId ? 'store-zone' : 'zone',
          zoneName: zone.name,
        };
      }
    }
  }

  // Repli global : réglages CMS commerce.*
  const rows = await db
    .select()
    .from(appSettings)
    .where(
      inArray(appSettings.key, [
        'commerce.baseShippingFee',
        'commerce.freeShippingThreshold',
      ]),
    );
  const getNum = (key: string, fallback: number) => {
    const row = rows.find((r) => r.key === key);
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  const baseRate = getNum('commerce.baseShippingFee', 1000);
  const freeThreshold = getNum('commerce.freeShippingThreshold', 10000);
  const isFree = subtotal >= freeThreshold;
  return {
    shippingCost: isFree ? 0 : baseRate,
    freeThreshold,
    isFree,
    estimatedDaysMin: 1,
    estimatedDaysMax: 7,
    source: 'global',
    zoneName: null,
  };
}
