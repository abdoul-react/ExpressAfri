import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

/**
 * Devis de livraison calculé côté serveur (« zone + repli global »).
 * Toutes les valeurs sont dans l'unité de référence brute, cohérente avec le
 * sous-total du panier (mêmes nombres que les prix produits).
 */
export type ShippingQuote = {
  shippingCost: number;
  freeThreshold: number | null;
  isFree: boolean;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  source: "zone" | "global";
  zoneName: string | null;
};

/**
 * Interroge /mobile/shipping-quote pour le pays de livraison + sous-total.
 * La clé de cache arrondit le sous-total pour éviter un refetch à chaque
 * centime. `country` peut être vide (repli global côté serveur).
 */
export function useShippingQuote(country: string | undefined, subtotal: number) {
  const roundedSubtotal = Math.round(subtotal || 0);
  return useQuery<ShippingQuote>({
    queryKey: ["shipping-quote", (country ?? "").toUpperCase(), roundedSubtotal],
    queryFn: () =>
      apiAdapter.get(
        `/mobile/shipping-quote?country=${encodeURIComponent(country ?? "")}&subtotal=${roundedSubtotal}`,
      ),
    staleTime: 60_000,
  });
}
