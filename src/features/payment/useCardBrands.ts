import { paymentService } from "./paymentService";
import { useQuery } from "@tanstack/react-query";

export function useCardBrands() {
  const { data: cardBrands = [] } = useQuery({
    queryKey: ["card-brands"],
    queryFn: () => paymentService.getCardBrands(),
    staleTime: 1000 * 60 * 60,
  });

  return cardBrands;
}
