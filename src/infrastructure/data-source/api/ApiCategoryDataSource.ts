import type { CategoryDataSource } from "../CategoryDataSource";
import type { Category } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiCategoryDataSource implements CategoryDataSource {
  async getCategories(): Promise<Category[]> {
    return apiAdapter.get("/mobile/categories");
  }

  async getSubcategories(categoryId: string): Promise<{ id: string; name: string; image?: string }[]> {
    if (!categoryId) return [];
    try {
      return await apiAdapter.get(`/mobile/categories/${categoryId}/children`);
    } catch {
      return [];
    }
  }
}
