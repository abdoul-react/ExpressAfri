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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { eq, like, and, or, sql } from 'drizzle-orm';
import * as fs from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { categories } from '../../database/schema/products';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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

  /**
   * Un gérant de boutique ne peut écrire que sur les catégories de sa boutique.
   * Les catégories globales (boutique système) restent réservées à l'Admin central.
   */
  private async assertWritable(categoryId: string, storeId?: string) {
    const [cat] = await this.db
      .select({ storeId: categories.storeId })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    if (storeId && cat.storeId !== storeId) {
      throw new ForbiddenException(
        'Cette catégorie appartient à une autre boutique',
      );
    }
    return cat;
  }

  @Get()
  @ApiOperation({ summary: 'Liste des catégories' })
  async list(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('storeId') storeId?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 50;
    const offset = (p - 1) * l;
    const conditions: any[] = [];
    if (search) conditions.push(like(categories.name, `%${search}%`));
    if (parentId) conditions.push(eq(categories.parentId, parentId));
    if (user?.storeId) {
      // Le gérant voit ses catégories et les catégories globales, jamais
      // celles d'une autre boutique. Le storeId du jeton prime sur la query.
      conditions.push(
        or(
          eq(categories.storeId, user.storeId),
          eq(categories.storeId, SYSTEM_STORE_ID),
        ),
      );
    } else if (storeId) {
      conditions.push(eq(categories.storeId, storeId));
    }
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
          // Sous-requête corrélée plutôt qu'un leftJoin + group by : le join
          // comptait les produits de toutes boutiques rattachés à la catégorie.
          productCount: sql<number>`(select count(*)::int from products p where p.category_id = categories.id and p.store_id = categories.store_id)`,
        })
        .from(categories)
        .where(where)
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
  async getById(@Param('id') id: string, @CurrentUser() user: any) {
    const [cat] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!cat) return null;
    if (
      user?.storeId &&
      cat.storeId !== user.storeId &&
      cat.storeId !== SYSTEM_STORE_ID
    ) {
      throw new ForbiddenException(
        'Cette catégorie appartient à une autre boutique',
      );
    }
    return cat;
  }

  @Post()
  @Permissions('categories.create')
  @ApiOperation({ summary: 'Créer une catégorie' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    // Le storeId vient du jeton pour un gérant : un champ libre ne peut pas
    // le remplacer, sinon il créerait des catégories chez un concurrent.
    const storeId = user?.storeId ?? body.storeId ?? SYSTEM_STORE_ID;
    if (body.parentId) await this.assertWritable(body.parentId, user?.storeId);
    const imageUrl = body.imageUrl ? persistBase64Image(body.imageUrl) : body.imageUrl;
    const payload = {
      ...body,
      imageUrl,
      storeId,
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
  @Permissions('categories.update')
  @ApiOperation({ summary: 'Modifier une catégorie' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const current = await this.assertWritable(id, user?.storeId);
    if (body.parentId) await this.assertWritable(body.parentId, user?.storeId);
    // Anti-cycle : interdire qu'une catégorie devienne son propre ancêtre
    if (body.parentId && body.parentId !== null) {
      let cursor: string | null = body.parentId;
      const visited = new Set<string>();
      while (cursor) {
        if (cursor === id) {
          return { error: 'Cycle détecté : une catégorie ne peut pas être son propre parent' };
        }
        if (visited.has(cursor)) break;
        visited.add(cursor);
        const [parent] = await this.db
          .select({ parentId: categories.parentId })
          .from(categories)
          .where(eq(categories.id, cursor))
          .limit(1);
        cursor = parent?.parentId ?? null;
      }
    }
    const imageUrl = body.imageUrl ? persistBase64Image(body.imageUrl) : body.imageUrl;
    const [cat] = await this.db
      .update(categories)
      .set({ ...body, imageUrl, storeId: current.storeId, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return cat;
  }

  @Delete(':id')
  @Permissions('categories.delete')
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.assertWritable(id, user?.storeId);
    // Réassigne les sous-catégories orphelines au niveau racine avant suppression
    await this.db.update(categories)
      .set({ parentId: null })
      .where(eq(categories.parentId, id));
    await this.db.delete(categories).where(eq(categories.id, id));
    return { deleted: true };
  }
}
