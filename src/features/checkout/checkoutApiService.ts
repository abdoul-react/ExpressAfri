import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export type CheckoutPayload = {
  items: {
    productId: string;
    title: string;
    /** URL HTTP de l'image — jamais de base64 pour éviter PayloadTooLarge */
    image?: string;
    quantity: number;
    unitPrice: string;
    variantLabel?: string;
    /** Sélection structurée → résolution de la variante + décrément de stock. */
    variantAttributes?: { name: string; value: string }[];
  }[];
  subtotal: string;
  shippingCost: string;
  discountAmount: string;
  total: string;
  currency: string;
  couponCode?: string;
  shippingAddress?: Record<string, unknown>;
  paymentMethod: string;
};

/** Retourne true si la chaîne est une data URL base64 (à ne pas envoyer). */
function isBase64(s?: string): boolean {
  return typeof s === 'string' && s.startsWith('data:');
}

export async function createOrder(payload: CheckoutPayload) {
  // Épurer les images base64 du payload avant l'envoi (évite PayloadTooLarge 413)
  const sanitized: CheckoutPayload = {
    ...payload,
    items: payload.items.map((item) => ({
      ...item,
      // On ne transmet l'image QUE si c'est une URL HTTP(S)
      image: isBase64(item.image) ? undefined : item.image,
    })),
  };
  return apiAdapter.post("/orders", sanitized as any);
}
