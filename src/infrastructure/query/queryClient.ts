import { QueryClient } from "@tanstack/react-query";

/**
 * Client de requêtes partagé — module séparé pour que le store d'auth puisse
 * purger le cache aux transitions de session (connexion, déconnexion, invité).
 * Sans cette purge, les données privées d'un utilisateur (conversations,
 * commandes, coupons…) restent en cache et s'affichent au compte suivant.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 s par défaut
      retry: 1,
      // 24 h : le cache est persisté sur disque (démarrage instantané) —
      // un gcTime court viderait les données restaurées avant leur usage.
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

/**
 * Clés de requêtes contenant des données PRIVÉES (liées au compte).
 * À purger à chaque changement de session. Les données publiques
 * (produits, catégories, bannières) restent en cache — elles sont
 * identiques pour tout le monde.
 */
const PRIVATE_QUERY_KEYS = [
  "conversations",
  "conversation",
  "conversation-media",
  "orders",
  "order",
  "coupon-history",
  "followed-stores",
  "feed-posts", // contient likedByMe (dépend du compte)
  "cart",
  "wishlist",
  "addresses",
  "profile",
  "wallet",
];

/** Purge toutes les données privées du cache (déconnexion / changement de compte). */
export function clearPrivateQueries() {
  for (const key of PRIVATE_QUERY_KEYS) {
    queryClient.removeQueries({ queryKey: [key] });
  }
}

/**
 * Décide quelles requêtes sont écrites sur disque pour le démarrage instantané.
 * On ne persiste QUE les données publiques (catalogue, contenu) : les données
 * privées restent en mémoire seulement — elles sont purgées aux changements de
 * session et ne doivent jamais survivre sur le disque de l'appareil.
 */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = String(queryKey[0] ?? "");
  return !PRIVATE_QUERY_KEYS.includes(root);
}

/** Clé AsyncStorage sous laquelle le cache de requêtes est persisté. */
export const QUERY_CACHE_STORAGE_KEY = "afriexpress-query-cache";
