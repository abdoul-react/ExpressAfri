import type { ProductDataSource } from "../ProductDataSource";
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
}
