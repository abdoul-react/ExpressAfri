import { warnIfMock } from "@/infrastructure/mock";
import { getDefaultAddress, useAddressStore } from "@/store/addressStore";
import { useCartStore } from "@/store/cartStore";
import { COUNTRIES } from "@/store/settingsStore";
import { useEffect, useMemo, useState } from "react";
import checkoutService, { PromoResult } from "./checkoutService";
import { useShippingQuote } from "./useShippingQuote";

export function useCheckout() {
  const allItems = useCartStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.selected), [allItems]);

  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult>(() => ({
    code: undefined,
    ratePercent: 0,
    amount: 0,
    applied: false,
  }));
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    warnIfMock("checkout");
    const timer = setTimeout(() => setStatus("idle"), 120);
    return () => clearTimeout(timer);
  }, []);

  const subtotal = checkoutService.calculateSubtotal(items as any);
  const discount = promoResult.applied ? promoResult.amount : 0;

  const address = useAddressStore(getDefaultAddress);
  const countryName = address
    ? (COUNTRIES.find((c) => c.code === address.countryCode)?.name ?? "")
    : "";

  // Livraison résolue côté serveur (zone du pays, sinon repli global). Un code
  // promo « FREESHIP » force la gratuité ; sinon on suit le devis. Repli local
  // tant que le devis n'est pas chargé.
  const { data: quote } = useShippingQuote(address?.countryCode, subtotal);
  const shipping = promoResult.freeShipping
    ? 0
    : quote
      ? quote.shippingCost
      : checkoutService.calculateShipping(subtotal, promoResult);
  const total = checkoutService.calculateTotal(subtotal, shipping, discount);

  return {
    items,
    subtotal,
    shipping,
    shippingQuote: quote,
    discount,
    total,
    address,
    countryName,
    isLoading: status === "loading",
    isError: status === "error",
    refetch: () => {
      setStatus("loading");
      const timer = setTimeout(() => setStatus("idle"), 120);
      return () => clearTimeout(timer);
    },
    promo: {
      open: promoOpen,
      code: promoCode,
      applied: promoResult.applied,
      ratePercent: promoResult.ratePercent,
      setCode: setPromoCode,
      toggle: () => setPromoOpen((v) => !v),
      apply: () => {
        const res = checkoutService.applyPromoCode(promoCode, subtotal);
        setPromoResult(res);
      },
      remove: () => {
        setPromoResult({
          code: undefined,
          ratePercent: 0,
          amount: 0,
          applied: false,
        });
        setPromoCode("");
      },
    },
  };
}
