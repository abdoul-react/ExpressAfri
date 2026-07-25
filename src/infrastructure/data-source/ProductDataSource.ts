import type { Product } from "@/types";

export type ReviewPayload = { rating: number; title?: string; content?: string };

export type ProductQuery = {
  search?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  sort?: string;
};

export interface ProductDataSource {
  getProducts(query?: ProductQuery): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getByCategory(categoryId: string): Promise<Product[]>;
  getProductReviews(productId: string): Promise<any[]>;
  submitProductReview(productId: string, data: ReviewPayload): Promise<{ id: string; updated: boolean }>;
}
