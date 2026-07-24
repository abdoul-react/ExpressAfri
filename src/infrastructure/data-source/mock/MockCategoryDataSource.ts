import type { CategoryDataSource } from "../CategoryDataSource";
import type { Category } from "@/types";
import { CATEGORIES } from "./categories";

export class MockCategoryDataSource implements CategoryDataSource {
  async getCategories(): Promise<Category[]> {
    return CATEGORIES;
  }

  async getSubcategories(categoryId: string): Promise<{ id: string; name: string; image?: string }[]> {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    return cat?.children ?? [];
  }
}
