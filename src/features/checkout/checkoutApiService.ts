import { apiAdapter } from "@/infrastructure/api/apiAdapter";

/** Moyen retenu pour une boutique du panier. */
export type StorePaymentChoice = {
  storeId: string;
  paymentMethod: string;
  phoneNumber?: string;
};

export type CheckoutPayload = {
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
  shippingAddressId: string;
  /** Repli appliqué à toutes les boutiques quand `payments` est absent. */
  paymentMethod?: string;
  payments?: StorePaymentChoice[];
  couponCode?: string;
  notes?: string;
  /**
   * Clé d'idempotence stable pour toute la tentative d'achat : générée au
   * début du flux de paiement et réutilisée à chaque retry, elle garantit
   * qu'un double-tap ou une reprise réseau ne recrée pas les commandes.
   */
  idempotencyKey?: string;
};

/** Une commande par boutique : l'API renvoie donc une liste, pas un objet. */
export type CreatedOrder = {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string | null;
  status: string;
  total: string;
  currency: string;
  paymentMethod?: string;
};

export type CheckoutResult = {
  orders: CreatedOrder[];
  total: string;
  currency: string;
  message: string;
};

export async function createOrder(payload: CheckoutPayload): Promise<CheckoutResult> {
  // La clé fournie par l'appelant (flux de paiement) prime : elle est stable
  // sur toute la tentative. Le repli horodaté ne protège qu'un retry immédiat.
  const idempotencyKey =
    payload.idempotencyKey ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return apiAdapter.post("/mobile/orders", { ...payload, idempotencyKey } as any);
}

export async function submitSuggestion(content: string): Promise<{ ok: boolean }> {
  return apiAdapter.post("/mobile/suggestions", { content });
}

export type CouponValidationResult =
  | { valid: true; ratePercent: number; amount: number; freeShipping: boolean; code: string }
  | { valid: false; reason: string };

export async function validateCoupon(
  code: string,
  orderAmount: number,
  customerEmail?: string,
): Promise<CouponValidationResult> {
  const res = await apiAdapter.post(`/coupons/${encodeURIComponent(code.toUpperCase())}/validate`, {
    orderAmount,
    customerEmail,
  }) as { valid: boolean; reason?: string; coupon?: { type: string; value: string; maxDiscount?: string } };

  if (!res.valid || !res.coupon) return { valid: false, reason: res.reason ?? 'Code invalide' };

  const { type, value, maxDiscount } = res.coupon;
  const numValue = Number(value);
  if (type === 'percentage') {
    const raw = (orderAmount * numValue) / 100;
    const amount = maxDiscount ? Math.min(raw, Number(maxDiscount)) : raw;
    return { valid: true, code: code.toUpperCase(), ratePercent: numValue, amount, freeShipping: false };
  }
  if (type === 'free_shipping') {
    return { valid: true, code: code.toUpperCase(), ratePercent: 0, amount: 0, freeShipping: true };
  }
  // fixed
  return { valid: true, code: code.toUpperCase(), ratePercent: 0, amount: Math.min(numValue, orderAmount), freeShipping: false };
}
