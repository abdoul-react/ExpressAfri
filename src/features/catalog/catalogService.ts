import type { Category, Product } from "@/types";
import type { ReviewPayload } from "@/infrastructure/data-source/ProductDataSource";
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

  async getSubcategories(categoryId: string): Promise<{ id: string; name: string; image?: string }[]> {
    return categoryDataSource.getSubcategories(categoryId);
  },

  async getProductReviews(productId: string) {
    return productDataSource.getProductReviews(productId);
  },

  async submitProductReview(productId: string, data: ReviewPayload) {
    return productDataSource.submitProductReview(productId, data);
  },
};
