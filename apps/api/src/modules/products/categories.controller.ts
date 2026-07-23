import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Inject } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { eq, like } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { categories } from '../../database/schema/products'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

// Boutique système partagée pour les catégories globales
const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  @Get()
  @ApiOperation({ summary: 'Liste des catégories' })
  async list(@Query() query: { search?: string }) {
    if (query.search) {
      return this.db.select().from(categories).where(like(categories.name, `%${query.search}%`)).orderBy(categories.name)
    }
    return this.db.select().from(categories).orderBy(categories.name)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail catégorie' })
  async getById(@Param('id') id: string) {
    const [cat] = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1)
    return cat ?? null
  }

  @Post()
  @ApiOperation({ summary: 'Créer une catégorie' })
  async create(@Body() body: any) {
    // Auto-affecter SYSTEM_STORE_ID si storeId absent pour éviter la FK violation
    const payload = {
      ...body,
      storeId: body.storeId || SYSTEM_STORE_ID,
      slug: body.slug || (body.name ?? 'cat').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36),
    }
    const [cat] = await this.db.insert(categories).values(payload).returning()
    return cat
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une catégorie' })
  async update(@Param('id') id: string, @Body() body: any) {
    const [cat] = await this.db.update(categories).set({ ...body, updatedAt: new Date() }).where(eq(categories.id, id)).returning()
    return cat
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  async delete(@Param('id') id: string) {
    await this.db.delete(categories).where(eq(categories.id, id))
    return { deleted: true }
  }
}
