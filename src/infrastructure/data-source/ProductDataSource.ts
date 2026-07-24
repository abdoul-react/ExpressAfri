import type { Product } from "@/types";

export type ReviewPayload = { rating: number; title?: string; content?: string };

export interface ProductDataSource {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getByCategory(categoryId: string): Promise<Product[]>;
  getProductReviews(productId: string): Promise<any[]>;
  submitProductReview(productId: string, data: ReviewPayload): Promise<{ id: string; updated: boolean }>;
}
