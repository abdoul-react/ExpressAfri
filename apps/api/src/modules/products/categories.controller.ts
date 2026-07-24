import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { eq, like, and, sql } from 'drizzle-orm';
import * as fs from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { categories, products } from '../../database/schema/products';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

const BASE64_RE = /^data:image\/(\w+);base64,(.+)$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB decoded

function persistBase64Image(dataUrl: string): string {
  const match = dataUrl.match(BASE64_RE);
  if (!match) return dataUrl;
  const [, ext, b64] = match;
  const buf = Buffer.from(b64, 'base64');
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error('Image trop volumineuse (max 5 Mo)');
  const dir = join(process.cwd(), 'uploads', 'categories');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  fs.writeFileSync(join(dir, filename), buf);
  return `/uploads/categories/${filename}`;
}

// Boutique système partagée pour les catégories globales
const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categories')
export class CategoriesController {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  @Get()
  @ApiOperation({ summary: 'Liste des catégories' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 50;
    const offset = (p - 1) * l;
    const conditions: any[] = [];
    if (search) conditions.push(like(categories.name, `%${search}%`));
    if (parentId) conditions.push(eq(categories.parentId, parentId));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select({
          id: categories.id,
          storeId: categories.storeId,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          parentId: categories.parentId,
          imageUrl: categories.imageUrl,
          isActive: categories.isActive,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
          productCount: sql<number>`cast(count(${products.id}) as int)`,
        })
        .from(categories)
        .leftJoin(products, eq(products.categoryId, categories.id))
        .where(where)
        .groupBy(categories.id)
        .orderBy(categories.name)
        .limit(l)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(categories)
        .where(where),
    ]);
    return { data, total: Number(count), page: p };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail catégorie' })
  async getById(@Param('id') id: string) {
    const [cat] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return cat ?? null;
  }

  @Post()
  @Permissions('categories.manage')
  @ApiOperation({ summary: 'Créer une catégorie' })
  async create(@Body() body: any) {
    const imageUrl = body.imageUrl ? persistBase64Image(body.imageUrl) : body.imageUrl;
    const payload = {
      ...body,
      imageUrl,
      storeId: body.storeId || SYSTEM_STORE_ID,
      slug:
        body.slug ||
        (body.name ?? 'cat')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') +
          '-' +
          Date.now().toString(36),
    };
    const [cat] = await this.db.insert(categories).values(payload).returning();
    return cat;
  }

  @Put(':id')
  @Permissions('categories.manage')
  @ApiOperation({ summary: 'Modifier une catégorie' })
  async update(@Param('id') id: string, @Body() body: any) {
    const imageUrl = body.imageUrl ? persistBase64Image(body.imageUrl) : body.imageUrl;
    const [cat] = await this.db
      .update(categories)
      .set({ ...body, imageUrl, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return cat;
  }

  @Delete(':id')
  @Permissions('categories.manage')
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  async delete(@Param('id') id: string) {
    // Réassigne les sous-catégories orphelines au niveau racine avant suppression
    await this.db.update(categories)
      .set({ parentId: null })
      .where(eq(categories.parentId, id));
    await this.db.delete(categories).where(eq(categories.id, id));
    return { deleted: true };
  }
}
