import type { WishlistDataSource } from "../WishlistDataSource";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiWishlistDataSource implements WishlistDataSource {
  async list(customerId: string): Promise<string[]> {
    const items = await apiAdapter.get("/wishlist");
    return (items as any[]).map((i: any) => i.productId);
  }

  async add(customerId: string, productId: string): Promise<void> {
    await apiAdapter.post(`/wishlist/${productId}`, {});
  }

  async remove(customerId: string, productId: string): Promise<void> {
    await apiAdapter.del(`/wishlist/${productId}`);
  }

  async has(customerId: string, productId: string): Promise<boolean> {
    const result = await apiAdapter.get(`/wishlist/${productId}/has`);
    return (result as any).has;
  }
}
