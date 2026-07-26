import type { PaymentMethod, Wallet } from "@/infrastructure/data-source";
import { paymentDataSource } from "@/infrastructure/data-source";

export const paymentService = {
  async getMethods(): Promise<PaymentMethod[]> {
    return paymentDataSource.getMethods();
  },

  async getCardBrands(): Promise<string[]> {
    return paymentDataSource.getCardBrands();
  },

  async initializePayment(orderId: string, method: string, returnUrl?: string): Promise<{ paymentUrl?: string; status: string; message?: string }> {
    return paymentDataSource.initializePayment(orderId, method, returnUrl);
  },

  async getOrderPaymentStatus(orderId: string) {
    return paymentDataSource.getOrderPaymentStatus(orderId);
  },

  async getWallet(): Promise<Wallet> {
    return paymentDataSource.getWallet();
  },
};
