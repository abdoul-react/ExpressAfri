import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { COUNTRIES, type Country } from "@/store/settingsStore";

/**
 * Liste « Expédier vers » pilotée par l'admin.
 * Les pays couverts par une zone de livraison active passent en tête
 * (section livrable) ; les autres suivent. Si l'admin n'a configuré
 * aucune zone, tous les pays sont proposés à plat.
 */
export function useShippingCountries(): {
  countries: (Country & { deliverable: boolean })[];
  hasZones: boolean;
} {
  const { data: activeCodes = [] } = useQuery<string[]>({
    queryKey: ["shipping-countries"],
    queryFn: () => apiAdapter.get("/mobile/shipping-countries"),
    staleTime: 5 * 60 * 1000,
  });

  const active = new Set(activeCodes.map((s) => s.toUpperCase()));
  const hasZones = active.size > 0;

  if (!hasZones) {
    return { countries: COUNTRIES.map((ct) => ({ ...ct, deliverable: true })), hasZones };
  }

  const deliverable = COUNTRIES.filter((ct) => active.has(ct.code)).map((ct) => ({ ...ct, deliverable: true }));
  const others = COUNTRIES.filter((ct) => !active.has(ct.code)).map((ct) => ({ ...ct, deliverable: false }));
  return { countries: [...deliverable, ...others], hasZones };
}
