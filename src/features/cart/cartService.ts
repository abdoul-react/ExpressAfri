import type { CartItem } from "@/types";

export type StockMap = Record<string, number>;

export function updateQuantity(
  items: CartItem[],
  productId: string,
  newQuantity: number,
  stock: StockMap = {},
) {
  const next = items.map((it) => {
    if (it.productId !== productId) return it;
    const available = stock[it.productId] ?? Infinity;
    const q = Math.max(1, Math.min(newQuantity, available));
    return { ...it, quantity: q };
  });
  const outOfStock = next.some(
    (it) =>
      stock[it.productId] !== undefined && stock[it.productId] < it.quantity,
  );
  return { items: next, outOfStock };
}

export function changeQuantityBy(
  items: CartItem[],
  productId: string,
  delta: number,
  stock: StockMap = {},
) {
  const target = items.find((i) => i.productId === productId);
  if (!target) return { items, outOfStock: false };
  return updateQuantity(items, productId, target.quantity + delta, stock);
}

export function removeItem(items: CartItem[], productId: string) {
  return items.filter((i) => i.productId !== productId);
}

export default { updateQuantity, changeQuantityBy, removeItem };
