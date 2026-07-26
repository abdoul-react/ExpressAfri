import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import type { CartStoreGroup } from "@/features/cart";
import { calculateSubtotal } from "./checkoutService";

/**
 * Devis de livraison d'UNE boutique, calculé côté serveur par la même
 * fonction que la création de commande : ce que l'écran affiche est ce que
 * le serveur facturera.
 */
export type StoreShippingQuote = {
  storeId: string;
  subtotal: number;
  shippingCost: number;
  freeThreshold: number | null;
  isFree: boolean;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  source: "store-zone" | "zone" | "global";
  zoneName: string | null;
};

export type StoreShippingQuotesResult = {
  quotes: StoreShippingQuote[];
  totalShipping: number;
  currency: string;
};

/**
 * Interroge POST /mobile/checkout/shipping-quotes pour chaque boutique du
 * panier. La clé de cache encode pays + (boutique, sous-total arrondi) pour
 * éviter un refetch à chaque centime. Les groupes sans storeId (articles
 * hérités) sont exclus : le serveur leur applique le repli global.
 */
export function useStoreShippingQuotes(
  country: string | undefined,
  groups: CartStoreGroup[],
) {
  const stores = groups
    .filter((g): g is CartStoreGroup & { storeId: string } => !!g.storeId)
    .map((g) => ({
      storeId: g.storeId,
      subtotal: Math.round(calculateSubtotal(g.items)),
    }));

  const query = useQuery<StoreShippingQuotesResult>({
    queryKey: [
      "shipping-quotes",
      (country ?? "").toUpperCase(),
      ...stores.map((s) => `${s.storeId}:${s.subtotal}`),
    ],
    queryFn: () =>
      apiAdapter.post("/mobile/checkout/shipping-quotes", {
        country: (country ?? "").toUpperCase(),
        stores,
      }),
    enabled: stores.length > 0 && !!country,
    staleTime: 60_000,
  });

  const quotesByStore = new Map<string, StoreShippingQuote>(
    (query.data?.quotes ?? []).map((q) => [q.storeId, q]),
  );

  return {
    ...query,
    quotesByStore,
    totalShipping: query.data?.totalShipping ?? null,
  };
}
