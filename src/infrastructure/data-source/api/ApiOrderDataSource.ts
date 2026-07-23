import type { OrderDataSource } from "../OrderDataSource";
import type { Order, OrderStatus } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiOrderDataSource implements OrderDataSource {
  async getOrdersByStatus(status: OrderStatus | "all"): Promise<Order[]> {
    return apiAdapter.get(`/orders/mobile/list?status=${status}`);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    // Endpoint mobile : même format que la liste (items {productId, image}, address objet)
    return apiAdapter.get(`/orders/mobile/${id}`);
  }
}
