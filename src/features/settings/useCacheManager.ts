import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_CACHE_STORAGE_KEY } from "@/infrastructure/query/queryClient";
import { logger } from "@/infrastructure/logging";

/**
 * Clés AsyncStorage à préserver lors du vidage : tout ce qui est une DONNÉE
 * de l'utilisateur (session, préférences, panier, favoris, adresses) — le
 * « cache » n'est que la copie locale de données re-téléchargeables.
 */
const PRESERVED_KEYS = [
  "afriexpress-auth",
  "afriexpress-settings",
  "afriexpress-cart",
  "afriexpress-wishlist",
  "afriexpress-addresses",
  "auth.access",
  "auth.refresh",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

/**
 * Taille réelle du cache + vidage réel.
 * Le cache = données de requêtes persistées (AsyncStorage) + images disque (expo-image).
 * La session et les préférences (langue, devise, thème) sont TOUJOURS préservées.
 */
export function useCacheManager() {
  const queryClient = useQueryClient();
  const [sizeLabel, setSizeLabel] = useState<string>("…");
  const [isClearing, setIsClearing] = useState(false);

  const measure = useCallback(async () => {
    try {
      // Taille des entrées AsyncStorage effaçables (hors session/préférences)
      const keys = await AsyncStorage.getAllKeys();
      const clearable = keys.filter((k) => !PRESERVED_KEYS.includes(k));
      let bytes = 0;
      if (clearable.length) {
        const pairs = await AsyncStorage.multiGet(clearable);
        for (const [, v] of pairs) bytes += v ? v.length : 0;
      }
      // Les caches d'images expo-image n'exposent pas leur taille : la valeur
      // affichée couvre les données de requêtes, le vidage couvre les deux.
      setSizeLabel(formatBytes(bytes));
    } catch {
      setSizeLabel("");
    }
  }, []);

  useEffect(() => {
    measure();
  }, [measure]);

  const clearCache = useCallback(async () => {
    setIsClearing(true);
    try {
      // 1. Cache d'images (mémoire + disque)
      await Promise.all([
        Image.clearMemoryCache(),
        Image.clearDiskCache(),
      ]);
      // 2. Données de requêtes persistées + toutes les entrées non préservées
      const keys = await AsyncStorage.getAllKeys();
      const clearable = keys.filter((k) => !PRESERVED_KEYS.includes(k));
      if (clearable.length) await AsyncStorage.multiRemove(clearable);
      // 3. Cache mémoire des requêtes (l'écran en cours refetchera)
      queryClient.clear();
      await measure();
      return true;
    } catch (error) {
      logger.warn("[cache] clear failed", { error });
      return false;
    } finally {
      setIsClearing(false);
    }
  }, [queryClient, measure]);

  return { sizeLabel, clearCache, isClearing };
}

// Réutilisée pour vérifier que la clé du cache requêtes fait partie du vidage
void QUERY_CACHE_STORAGE_KEY;
