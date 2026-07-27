import { warnIfMock } from "@/infrastructure/mock";
import { getDefaultAddress, useAddressStore } from "@/store/addressStore";
import { useCartStore } from "@/store/cartStore";
import { COUNTRIES } from "@/store/settingsStore";
import { useEffect, useMemo, useState } from "react";
import { useCartStoreGroups, type CartStoreGroup } from "@/features/cart";
import checkoutService, { PromoResult } from "./checkoutService";
import { validateCoupon } from "./checkoutApiService";
import { useShippingQuote } from "./useShippingQuote";
import {
  useStoreShippingQuotes,
  type StoreShippingQuote,
} from "./useStoreShippingQuotes";

export function useCheckout() {
  const allItems = useCartStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.selected), [allItems]);
  const groups = useCartStoreGroups(items);

  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
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

  // Livraison par boutique : chaque boutique facture ses propres frais, le
  // total est la somme des devis. Même calcul serveur que la création de
  // commande → total affiché = total facturé.
  const storeQuotes = useStoreShippingQuotes(address?.countryCode, groups);

  // Repli : devis global historique tant que les devis par boutique ne sont
  // pas chargés (ou pour les paniers d'articles hérités sans storeId).
  const { data: globalQuote } = useShippingQuote(
    address?.countryCode,
    subtotal,
  );

  const shipping = promoResult.freeShipping
    ? 0
    : storeQuotes.totalShipping != null
      ? storeQuotes.totalShipping
      : globalQuote
        ? globalQuote.shippingCost
        : checkoutService.calculateShipping(subtotal, promoResult);
  const total = checkoutService.calculateTotal(subtotal, shipping, discount);

  return {
    items,
    groups,
    subtotal,
    shipping,
    shippingQuote: globalQuote,
    quotesByStore: storeQuotes.quotesByStore,
    quotesLoading: storeQuotes.isLoading,
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
      error: promoError,
      loading: promoLoading,
      apply: async () => {
        if (!promoCode.trim()) return;
        setPromoError(null);
        setPromoLoading(true);
        try {
          const res = await validateCoupon(promoCode, subtotal);
          if (!res.valid) {
            setPromoError(res.reason);
          } else {
            setPromoResult({ code: res.code, ratePercent: res.ratePercent, amount: res.amount, applied: true, freeShipping: res.freeShipping });
          }
        } catch {
          setPromoError('Erreur réseau, réessayez.');
        } finally {
          setPromoLoading(false);
        }
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

export type { CartStoreGroup, StoreShippingQuote };
