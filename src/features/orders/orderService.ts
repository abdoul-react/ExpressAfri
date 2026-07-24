import type { Order, OrderStatus } from "@/types";
import type { ReturnPayload } from "@/infrastructure/data-source/OrderDataSource";
import { orderDataSource } from "@/infrastructure/data-source";

export const orderService = {
  async getOrdersByStatus(status: OrderStatus | "all"): Promise<Order[]> {
    return orderDataSource.getOrdersByStatus(status);
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    return orderDataSource.getOrderById(id);
  },

  async submitReturn(payload: ReturnPayload): Promise<{ ok: boolean }> {
    return orderDataSource.submitReturn(payload);
  },
};
