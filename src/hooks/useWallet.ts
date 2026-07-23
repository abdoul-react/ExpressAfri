import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { useAuthStore } from "@/store/authStore";

/**
 * Portefeuille du client : points de fidélité (bonus) + total économisé
 * (somme des remises appliquées sur ses commandes, en FCFA).
 */
export type Wallet = {
  balance: number;
  lifetime: number;
  tier: string;
  totalSavings: number;
};

const EMPTY_WALLET: Wallet = { balance: 0, lifetime: 0, tier: "bronze", totalSavings: 0 };

/**
 * Interroge /mobile/wallet. Donnée privée : requête activée uniquement quand
 * le client est connecté (sinon on renvoie un portefeuille vide sans appel).
 */
export function useWallet() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: () => apiAdapter.get("/mobile/wallet"),
    enabled: isAuthenticated,
    staleTime: 30_000,
    initialData: EMPTY_WALLET,
  });
}
