import { useCartStore } from "@/store/cartStore";

/**
 * Compteur d'articles du panier pour les badges d'en-tête.
 * Retourne undefined quand le panier est vide (pas de pastille « 0 »).
 */
export function useCartBadge(): number | undefined {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  return count || undefined;
}
