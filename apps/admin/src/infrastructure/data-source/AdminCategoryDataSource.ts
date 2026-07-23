export interface Category {
  id: string
  name: string
  slug: string
  parentId?: string | null
  imageUrl?: string
  productCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminCategoryDataSource {
  list(): Promise<Category[]>
  getById(id: string): Promise<Category>
  create(data: { name: string; parentId?: string; imageUrl?: string }): Promise<Category>
  update(id: string, data: { name?: string; parentId?: string; imageUrl?: string }): Promise<Category>
  delete(id: string): Promise<void>
}
