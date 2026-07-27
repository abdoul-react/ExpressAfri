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
  cancelOrder(id: string): Promise<{ ok: boolean }>;
  deleteOrder(id: string): Promise<{ ok: boolean }>;
  payExistingOrder(id: string, paymentMethod: string, phoneNumber?: string): Promise<{ paymentUrl?: string; status: string; message?: string }>;
}
