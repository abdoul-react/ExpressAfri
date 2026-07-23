import type { CartItem } from "@/types";

export type PromoResult = {
  code?: string;
  ratePercent: number;
  amount: number;
  applied: boolean;
  freeShipping?: boolean;
};

export function calculateSubtotal(items: CartItem[]) {
  return items.reduce(
    (s, it) => s + (it.priceUsd || 0) * (it.quantity || 0),
    0,
  );
}

export function calculateDiscount(subtotal: number, ratePercent = 0) {
  if (!ratePercent) return 0;
  return Math.round((subtotal * ratePercent) / 100);
}

export function calculateTotal(subtotal: number, shipping = 0, discount = 0) {
  return Math.max(0, subtotal + (shipping || 0) - (discount || 0));
}

const BASE_SHIPPING_USD = 1.5;
const FREE_SHIPPING_THRESHOLD_USD = 50; // orders >= this get free shipping

export function calculateShipping(subtotal: number, promo?: PromoResult) {
  if (!subtotal || subtotal <= 0) return 0;
  if (promo?.freeShipping) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD_USD) return 0;
  return BASE_SHIPPING_USD;
}

// Simple promo application. Keep business rules here so screens remain thin.
export function applyPromoCode(code?: string, subtotal = 0): PromoResult {
  if (!code)
    return { code: undefined, ratePercent: 0, amount: 0, applied: false };

  // Mock rules: SAVE10 => 10%, FREESHIP => free shipping
  const c = code.trim().toUpperCase();
  if (c === "SAVE10") {
    const ratePercent = 10;
    const amount = calculateDiscount(subtotal, ratePercent);
    return { code: c, ratePercent, amount, applied: true };
  }

  if (c === "FREESHIP") {
    return {
      code: c,
      ratePercent: 0,
      amount: 0,
      applied: true,
      freeShipping: true,
    };
  }

  return { code: c, ratePercent: 0, amount: 0, applied: false };
}

export default {
  calculateSubtotal,
  calculateDiscount,
  calculateTotal,
  calculateShipping,
  applyPromoCode,
};
