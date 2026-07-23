import { orderService } from "./orderService";
import type { OrderStatus } from "@/types";
import { useQuery } from "@tanstack/react-query";

export function useOrders(status: OrderStatus | "all") {
  const { data = [], isLoading } = useQuery({
    queryKey: ["orders", status],
    queryFn: () => orderService.getOrdersByStatus(status),
  });

  return { orders: data, isLoading };
}

export function useOrderDetail(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => orderService.getOrderById(id),
    enabled: !!id,
  });

  return { order: data, isLoading };
}
