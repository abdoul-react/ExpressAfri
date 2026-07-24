import { useQuery } from "@tanstack/react-query";
import { paymentService } from "@/features/payment/paymentService";
import { useAuthStore } from "@/store/authStore";
import type { Wallet } from "@/infrastructure/data-source";

const EMPTY_WALLET: Wallet = { balance: 0, lifetime: 0, tier: "bronze", totalSavings: 0 };

/**
 * Interroge /mobile/wallet via paymentService → DataSource.
 * Requête activée uniquement quand le client est connecté.
 */
export function useWallet() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: () => paymentService.getWallet(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    initialData: EMPTY_WALLET,
  });
}
