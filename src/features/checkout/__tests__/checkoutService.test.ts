import { describe, expect, test } from "vitest";
import { applyPromoCode, calculateShipping } from "../checkoutService";

describe("checkoutService", () => {
  test("free shipping for subtotal above threshold", () => {
    const shipping = calculateShipping(100);
    expect(shipping).toBe(0);
  });

  test("base shipping for small subtotal", () => {
    const shipping = calculateShipping(10);
    expect(shipping).toBeGreaterThan(0);
  });

  test("FREESHIP promo disables shipping", () => {
    const promo = applyPromoCode("FREESHIP", 10);
    expect(promo.applied).toBe(true);
    expect(promo.freeShipping).toBe(true);
    const shipping = calculateShipping(10, promo as any);
    expect(shipping).toBe(0);
  });

  test("SAVE10 promo applies discount", () => {
    const promo = applyPromoCode("SAVE10", 200);
    expect(promo.applied).toBe(true);
    expect(promo.ratePercent).toBe(10);
    expect(promo.amount).toBeGreaterThan(0);
  });
});
