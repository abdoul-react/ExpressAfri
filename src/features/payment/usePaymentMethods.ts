import { paymentService } from "./paymentService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function usePaymentMethods() {
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => paymentService.getMethods(),
    retry: 1,
  });

  const [selected, setSelected] = useState<string | null>(null);

  function selectMethod(id: string | null) {
    setSelected(id);
  }

  return { methods: data, isLoading, error, refetch, selected, selectMethod };
}
