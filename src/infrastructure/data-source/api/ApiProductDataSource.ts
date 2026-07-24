import type { ProductDataSource, ReviewPayload } from "../ProductDataSource";
import type { Product } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiProductDataSource implements ProductDataSource {
  async getProducts(): Promise<Product[]> {
    return apiAdapter.get("/mobile/products");
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return apiAdapter.get(`/mobile/products/${id}`);
  }

  async getByCategory(categoryId: string): Promise<Product[]> {
    return apiAdapter.get(`/mobile/categories/${categoryId}/products`);
  }

  async getProductReviews(productId: string): Promise<any[]> {
    return apiAdapter.get(`/mobile/products/${productId}/reviews`);
  }

  async submitProductReview(productId: string, data: ReviewPayload): Promise<{ id: string; updated: boolean }> {
    return apiAdapter.post(`/mobile/products/${productId}/reviews`, data as Record<string, unknown>);
  }
}
