import type { IconName } from "@/icons";
import type { PaymentMethodId } from "@/types";

export type PaymentMethod = {
  id: PaymentMethodId;
  icon: IconName;
  labelKey: string;
  hintKey: string;
  /** URL du logo de la méthode de paiement (servie par l'API). */
  logoUrl?: string;
  operators?: string[];
  type?: string;
  supportedCountries?: string[];
};

export interface PaymentDataSource {
  getMethods(): Promise<PaymentMethod[]>;
  getCardBrands(): Promise<string[]>;
  initializePayment(orderId: string, method: string): Promise<{ paymentUrl?: string; status: string }>;
}
