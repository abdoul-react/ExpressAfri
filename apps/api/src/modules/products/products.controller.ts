import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, ForbiddenException, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CreateProductDto, UpdateProductDto, ModerateProductDto, ProductQueryDto } from './products.dto'

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  // Un gérant de boutique (user.storeId présent) ne voit et ne touche QUE les
  // produits de sa boutique : le storeId du jeton écrase tout ce que le client envoie.

  @Get()
  @ApiOperation({ summary: 'Liste des produits' })
  async list(@Query() query: ProductQueryDto, @CurrentUser() user: any) {
    const params = user?.storeId ? { ...query, storeId: user.storeId } : query
    return this.service.list(params)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail produit avec variantes et images' })
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const product = await this.service.getById(id)
    if (user?.storeId && product.storeId !== user.storeId) {
      throw new ForbiddenException('Ce produit appartient à une autre boutique')
    }
    return product
  }

  @Post()
  @ApiOperation({ summary: 'Créer un produit' })
  async create(@Body() body: CreateProductDto, @CurrentUser() user: any) {
    const payload = user?.storeId ? { ...body, storeId: user.storeId } : body
    return this.service.create(payload)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un produit' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateProductDto, @CurrentUser() user: any) {
    let payload: UpdateProductDto & { storeId?: string } = body
    if (user?.storeId) {
      await this.assertOwnership(id, user.storeId)
      payload = { ...body, storeId: user.storeId }
    }
    return this.service.update(id, payload)
  }

  @Put(':id/moderate')
  @ApiOperation({ summary: 'Approuver/rejeter modération' })
  async moderate(@Param('id', ParseUUIDPipe) id: string, @Body() body: ModerateProductDto, @CurrentUser() user: any) {
    // La modération reste réservée à la plateforme : un gérant ne s'auto-approuve pas
    if (user?.storeId) throw new ForbiddenException('La modération est réservée à l\'équipe AfriExpress')
    return this.service.moderate(id, body.status, body.reason)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un produit' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    if (user?.storeId) await this.assertOwnership(id, user.storeId)
    return this.service.delete(id)
  }

  private async assertOwnership(productId: string, storeId: string) {
    const product = await this.service.getById(productId)
    if (product.storeId !== storeId) {
      throw new ForbiddenException('Ce produit appartient à une autre boutique')
    }
  }
}
