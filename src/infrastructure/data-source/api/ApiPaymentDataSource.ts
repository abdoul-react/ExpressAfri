import type { PaymentDataSource, Wallet } from "../PaymentDataSource";
import type { PaymentMethod } from "../PaymentDataSource";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiPaymentDataSource implements PaymentDataSource {
  async getMethods(): Promise<PaymentMethod[]> {
    return apiAdapter.get("/mobile/payment/methods");
  }

  async getCardBrands(): Promise<string[]> {
    return apiAdapter.get("/mobile/payment/card-brands");
  }

  async initializePayment(orderId: string, method: string, returnUrl?: string): Promise<{ paymentUrl?: string; status: string; message?: string }> {
    return apiAdapter.post(`/payments/${orderId}/initialize`, { method, returnUrl });
  }

  async getOrderPaymentStatus(orderId: string): Promise<{ status: string; method: string; amount: string; currency: string }> {
    return apiAdapter.get(`/payments/order/${orderId}/status`);
  }

  async getWallet(): Promise<Wallet> {
    return apiAdapter.get("/mobile/wallet");
  }
}
