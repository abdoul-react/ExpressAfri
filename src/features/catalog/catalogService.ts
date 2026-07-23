import type { Category, Product } from "@/types";
import { productDataSource, categoryDataSource } from "@/infrastructure/data-source";

export const catalogService = {
  async getProducts(): Promise<Product[]> {
    return productDataSource.getProducts();
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return productDataSource.getProductById(id);
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    return productDataSource.getByCategory(categoryId);
  },

  async getCategories(): Promise<Category[]> {
    return categoryDataSource.getCategories();
  },

  async getSubcategories(categoryId: string): Promise<string[]> {
    return categoryDataSource.getSubcategories(categoryId);
  },
};
