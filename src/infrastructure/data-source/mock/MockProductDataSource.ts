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
}
