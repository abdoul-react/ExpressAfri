import type { PaymentMethod } from "@/infrastructure/data-source";
import { paymentDataSource } from "@/infrastructure/data-source";

export const paymentService = {
  async getMethods(): Promise<PaymentMethod[]> {
    return paymentDataSource.getMethods();
  },

  async getCardBrands(): Promise<string[]> {
    return paymentDataSource.getCardBrands();
  },

  async initializePayment(orderId: string, method: string): Promise<{ paymentUrl?: string; status: string }> {
    return paymentDataSource.initializePayment(orderId, method);
  },
};
