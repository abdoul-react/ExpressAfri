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
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return apiAdapter.post("/mobile/orders", { ...payload, idempotencyKey } as any);
}

export async function submitSuggestion(content: string): Promise<{ ok: boolean }> {
  return apiAdapter.post("/mobile/suggestions", { content });
}
