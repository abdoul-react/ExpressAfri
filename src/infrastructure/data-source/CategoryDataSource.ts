import type { Category } from "@/types";

export interface CategoryDataSource {
  getCategories(): Promise<Category[]>;
  getSubcategories(categoryId: string): Promise<{ id: string; name: string; image?: string }[]>;
}
