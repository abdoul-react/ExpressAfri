import type { AdminCategoryDataSource } from '../AdminCategoryDataSource'
import { MOCK_CATEGORIES } from './data/mockCategories'

export class MockAdminCategoryDataSource implements AdminCategoryDataSource {
  private categories = [...MOCK_CATEGORIES]
  private delay(ms = 300): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(): Promise<any[]> {
    await this.delay()
    return [...this.categories]
  }

  async getById(id: string): Promise<any> {
    await this.delay()
    const cat = this.categories.find((c) => c.id === id)
    if (!cat) throw new Error('Catégorie introuvable')
    return cat
  }

  async create(data: { name: string; parentId?: string; imageUrl?: string }): Promise<any> {
    await this.delay()
    const cat = {
      id: `cat_${String(this.categories.length + 1)}`,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      parentId: data.parentId ?? null,
      imageUrl: data.imageUrl ?? undefined,
      productCount: 0,
    }
    this.categories.push(cat)
    return cat
  }

  async update(id: string, data: { name?: string; parentId?: string; imageUrl?: string }): Promise<any> {
    await this.delay()
    const index = this.categories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Catégorie introuvable')
    this.categories[index] = { ...this.categories[index], ...data }
    return this.categories[index]
  }

  async delete(id: string): Promise<void> {
    await this.delay()
    const index = this.categories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Catégorie introuvable')
    this.categories.splice(index, 1)
  }
}
