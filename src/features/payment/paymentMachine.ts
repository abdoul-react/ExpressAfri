import type { Order } from "@/features/order";

export type PaymentMethod = {
  id: string;
  label: string;
  type: string;
};

export type PaymentStatus =
  | "initiated"
  | "processing"
  | "success"
  | "error"
  | "cancelled";

export type Payment = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
};

export function initiatePayment(order: Order, method: PaymentMethod): Payment {
  return {
    id: `pay_${Date.now()}`,
    orderId: order.id,
    method,
    status: "initiated",
    startedAt: new Date().toISOString(),
  };
}

export function setPaymentStatus(
  payment: Payment,
  status: PaymentStatus,
  errorMessage?: string,
): Payment {
  return {
    ...payment,
    status,
    finishedAt: status === "processing" ? undefined : new Date().toISOString(),
    errorMessage: errorMessage ?? payment.errorMessage,
  };
}

export default { initiatePayment, setPaymentStatus };
