import { useMemo } from 'react';
import type { CartItem } from '@/types';

export type CartStoreGroup = {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
};

/** Clé du groupe de repli : articles sans boutique connue. */
export const UNKNOWN_STORE_KEY = '__unknown__';

/**
 * Regroupe un panier par boutique d'origine — chaque groupe deviendra une
 * commande distincte côté API.
 *
 * L'ordre suit l'ordre d'ajout des articles, pas l'alphabet : le client retrouve
 * ses ajouts là où il les a faits.
 *
 * Les articles persistés avant l'introduction de `storeId` tombent dans un
 * groupe de repli plutôt que d'être masqués.
 */
export function groupCartByStore(items: CartItem[]): CartStoreGroup[] {
  const byStore = new Map<string, CartStoreGroup>();
  for (const item of items) {
    const key = item.storeId ?? UNKNOWN_STORE_KEY;
    if (!byStore.has(key)) {
      byStore.set(key, {
        storeId: item.storeId ?? null,
        storeName: item.storeName ?? null,
        items: [],
      });
    }
    byStore.get(key)!.items.push(item);
  }
  return [...byStore.values()];
}

export function useCartStoreGroups(items: CartItem[]): CartStoreGroup[] {
  return useMemo(() => groupCartByStore(items), [items]);
}
