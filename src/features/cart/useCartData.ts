import { useCartStore } from "@/store/cartStore";
import type { CartItem } from "@/types";
import { useEffect, useState } from "react";
import cartService from "./cartService";

export function useCartData() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    const timer = setTimeout(() => setStatus("idle"), 120);
    return () => clearTimeout(timer);
  }, []);

  const refetch = () => {
    setStatus("loading");
    const timer = setTimeout(() => setStatus("idle"), 120);
    return () => clearTimeout(timer);
  };

  function updateQuantity(
    productId: string,
    newQuantity: number,
    stock: Record<string, number> = {},
  ) {
    const { items: next } = cartService.updateQuantity(
      items,
      productId,
      newQuantity,
      stock,
    );
    const target = next.find((i: CartItem) => i.productId === productId);
    if (target) setQuantity(productId, target.quantity);
  }

  function changeBy(
    productId: string,
    delta: number,
    stock: Record<string, number> = {},
  ) {
    const { items: next } = cartService.changeQuantityBy(
      items,
      productId,
      delta,
      stock,
    );
    const target = next.find((i: CartItem) => i.productId === productId);
    if (target) setQuantity(productId, target.quantity);
  }

  function removeItem(productId: string) {
    remove(productId);
  }

  return {
    items,
    isLoading: status === "loading",
    isError: status === "error",
    refetch,
    updateQuantity,
    changeBy,
    removeItem,
  };
}
