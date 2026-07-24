import type { ProductDataSource } from "../ProductDataSource";
import type { Product } from "@/types";
import { PRODUCTS, getProductById, getProductsByCategory } from "./products";

export class MockProductDataSource implements ProductDataSource {
  async getProducts(): Promise<Product[]> {
    return PRODUCTS;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return getProductById(id);
  }

  async getByCategory(categoryId: string): Promise<Product[]> {
    return getProductsByCategory(categoryId);
  }

  async getProductReviews(_productId: string): Promise<any[]> {
    return [];
  }

  async submitProductReview(_productId: string, _data: import("../ProductDataSource").ReviewPayload): Promise<{ id: string; updated: boolean }> {
    return { id: "", updated: false };
  }
}
