import type { CartItem } from "@/types";

export type OrderStatus =
  | "created"
  | "payment_pending"
  | "processing"
  | "success"
  | "failed"
  | "cancelled";

export type Order = {
  id: string;
  items: CartItem[];
  totalUsd: number;
  addressId?: string;
  status: OrderStatus;
  createdAt: string;
};

export function createOrder(payload: {
  items: CartItem[];
  totalUsd: number;
  addressId?: string;
}): Order {
  return {
    id: `ord_${Date.now()}`,
    items: payload.items,
    totalUsd: payload.totalUsd,
    addressId: payload.addressId,
    status: "created",
    createdAt: new Date().toISOString(),
  };
}

// Deterministic, server-like transition rules. Keep client optimistic but consistent.
export function transitionOrderStatus(order: Order, next: OrderStatus): Order {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    created: ["payment_pending", "cancelled"],
    payment_pending: ["processing", "failed", "cancelled"],
    processing: ["success", "failed", "cancelled"],
    success: [],
    failed: [],
    cancelled: [],
  };

  if (allowed[order.status].includes(next)) {
    return { ...order, status: next };
  }
  // invalid transition — no-op
  return order;
}

export default { createOrder, transitionOrderStatus };
