import { orderService } from "./orderService";
import type { OrderStatus } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.cancelOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function usePayExistingOrder() {
  return useMutation({
    mutationFn: ({
      id,
      paymentMethod,
      phoneNumber,
    }: {
      id: string;
      paymentMethod: string;
      phoneNumber?: string;
    }) => orderService.payExistingOrder(id, paymentMethod, phoneNumber),
  });
}
