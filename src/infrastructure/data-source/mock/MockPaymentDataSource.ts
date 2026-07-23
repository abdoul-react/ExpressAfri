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
}
