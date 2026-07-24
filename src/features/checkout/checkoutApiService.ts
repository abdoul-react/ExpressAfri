import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export type CheckoutPayload = {
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
  shippingAddressId: string;
  paymentMethod: string;
  couponCode?: string;
  notes?: string;
};

export async function createOrder(payload: CheckoutPayload) {
  return apiAdapter.post("/mobile/orders", payload as any);
}

export async function submitSuggestion(content: string): Promise<{ ok: boolean }> {
  return apiAdapter.post("/mobile/suggestions", { content });
}
