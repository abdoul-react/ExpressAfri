import type { OrderDataSource, ReturnPayload } from "../OrderDataSource";
import type { Order, OrderStatus } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiOrderDataSource implements OrderDataSource {
  async getOrdersByStatus(status: OrderStatus | "all"): Promise<Order[]> {
    return apiAdapter.get(`/orders/mobile/list?status=${status}`);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return apiAdapter.get(`/orders/mobile/${id}`);
  }

  async submitReturn(payload: ReturnPayload): Promise<{ ok: boolean }> {
    return apiAdapter.post('/returns/mobile', payload as unknown as Record<string, unknown>);
  }

  async cancelOrder(id: string): Promise<{ ok: boolean }> {
    return apiAdapter.post(`/orders/mobile/${id}/cancel`, {});
  }

  async deleteOrder(id: string): Promise<{ ok: boolean }> {
    return apiAdapter.del(`/orders/mobile/${id}`);
  }

  async payExistingOrder(
    id: string,
    paymentMethod: string,
    phoneNumber?: string,
  ): Promise<{ paymentUrl?: string; status: string; message?: string }> {
    return apiAdapter.post(`/orders/mobile/${id}/pay`, {
      paymentMethod,
      ...(phoneNumber ? { phoneNumber } : {}),
    });
  }
}
