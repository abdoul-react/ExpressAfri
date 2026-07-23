import type { AdminCategoryDataSource, Category } from '../AdminCategoryDataSource'
import api from '@/lib/api'

export class ApiAdminCategoryDataSource implements AdminCategoryDataSource {
  async list(): Promise<Category[]> {
    const { data } = await api.get('/categories')
    return data as Category[]
  }

  async getById(id: string): Promise<Category> {
    const { data } = await api.get(`/categories/${id}`)
    return data as Category
  }

  async create(input: { name: string; parentId?: string; imageUrl?: string }): Promise<Category> {
    const { data } = await api.post('/categories', input)
    return data as Category
  }

  async update(id: string, input: { name?: string; parentId?: string; imageUrl?: string }): Promise<Category> {
    const { data } = await api.put(`/categories/${id}`, input)
    return data as Category
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/categories/${id}`)
  }
}
