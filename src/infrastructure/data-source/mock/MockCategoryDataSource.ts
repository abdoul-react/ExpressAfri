import type { CategoryDataSource } from "../CategoryDataSource";
import type { Category } from "@/types";
import { CATEGORIES, SUBCATEGORIES } from "./categories";

export class MockCategoryDataSource implements CategoryDataSource {
  async getCategories(): Promise<Category[]> {
    return CATEGORIES;
  }

  async getSubcategories(categoryId: string): Promise<string[]> {
    return SUBCATEGORIES[categoryId] ?? ["subcategories.defaultNew", "subcategories.defaultPopular", "subcategories.defaultPromos"];
  }
}
