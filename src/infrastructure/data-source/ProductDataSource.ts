import type { Product } from "@/types";

export interface ProductDataSource {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getByCategory(categoryId: string): Promise<Product[]>;
}
