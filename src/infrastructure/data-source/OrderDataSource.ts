import type { Order, OrderStatus } from "@/types";

export type ReturnPayload = {
  orderId: string;
  reason: string;
  items: { productId: string; quantity: number }[];
};

export interface OrderDataSource {
  getOrdersByStatus(status: OrderStatus | "all"): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  submitReturn(payload: ReturnPayload): Promise<{ ok: boolean }>;
}
