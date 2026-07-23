import type { Order, OrderStatus } from "@/types";

export interface OrderDataSource {
  getOrdersByStatus(status: OrderStatus | "all"): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
}
