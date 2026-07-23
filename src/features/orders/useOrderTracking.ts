import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { useAuthStore } from "@/store/authStore";

export type TrackingEvent = { key: string; at: string; detail?: string };

export type TrackingCourier = {
  name: string;
  phone: string;
  vehicleType: string;
  photo: string | null;
  rating: number;
  totalDeliveries: number;
  status: string;
};

export type OrderTracking = {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  currentStep: number;
  courier: TrackingCourier | null;
  events: TrackingEvent[];
};

/**
 * Suivi de livraison « temps réel » : la chronologie serveur (statuts admin +
 * événements livreur) est resynchronisée automatiquement toutes les 15 s tant
 * que l'écran est ouvert — chaque étape apparaît dès qu'elle est enregistrée.
 */
export function useOrderTracking(orderId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, isError, refetch } = useQuery<OrderTracking>({
    queryKey: ["order-tracking", orderId],
    queryFn: () => apiAdapter.get(`/orders/mobile/${orderId}/tracking`),
    enabled: !!orderId && isAuthenticated,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
  return { tracking: data, isLoading, isError, refetch };
}
