import type { PaymentDataSource } from "../PaymentDataSource";
import type { PaymentMethod } from "../PaymentDataSource";
import { PAYMENT_METHODS } from "./payments";

export class MockPaymentDataSource implements PaymentDataSource {
  async getMethods(): Promise<PaymentMethod[]> {
    return PAYMENT_METHODS;
  }

  async getCardBrands(): Promise<string[]> {
    return ["VISA", "Mastercard", "UnionPay", "Amex", "JCB"];
  }

  async getOrderPaymentStatus(_orderId: string): Promise<{ status: string; method: string; amount: string; currency: string }> {
    return { status: 'captured', method: 'cash_on_delivery', amount: '0', currency: 'XOF' };
  }

  async initializePayment(_orderId: string, _method: string, _returnUrl?: string): Promise<{ paymentUrl?: string; status: string; message?: string }> {
    return { status: "pending" };
  }

  async getWallet(): Promise<import("../PaymentDataSource").Wallet> {
    return { balance: 0, lifetime: 0, tier: "bronze", totalSavings: 0 };
  }
}
