import type { CategoryDataSource } from "../CategoryDataSource";
import type { Category } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiCategoryDataSource implements CategoryDataSource {
  async getCategories(): Promise<Category[]> {
    return apiAdapter.get("/mobile/categories");
  }

  async getSubcategories(categoryId: string): Promise<string[]> {
    if (!categoryId) return [];
    try {
      const children: { id: string; name: string }[] = await apiAdapter.get(
        `/mobile/categories/${categoryId}/children`,
      );
      return children.map((c) => c.name);
    } catch {
      return [];
    }
  }
}
