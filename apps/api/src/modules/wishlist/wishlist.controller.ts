import { Controller, Get, Post, Delete, Param, UseGuards, UnauthorizedException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { WishlistService } from './wishlist.service'
import { CustomerAuthGuard } from '../mobile/customer-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CustomerRoute } from '../../common/decorators/customer-route.decorator'

@ApiTags('Wishlist')
@Controller('wishlist')
// CustomerRoute : sans lui, le JwtAuthGuard global (admin) rejette les jetons clients → 401
@CustomerRoute()
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private service: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des produits dans la wishlist' })
  async list(@CurrentUser() user: any) {
    if (!user?.id) return []
    return this.service.list(user.id)
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Ajouter un produit à la wishlist' })
  async add(@CurrentUser() user: any, @Param('productId') productId: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.add(user.id, productId)
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Retirer un produit de la wishlist' })
  async remove(@CurrentUser() user: any, @Param('productId') productId: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.remove(user.id, productId)
  }

  @Get(':productId/has')
  @ApiOperation({ summary: 'Vérifier si un produit est dans la wishlist' })
  async has(@CurrentUser() user: any, @Param('productId') productId: string) {
    if (!user?.id) return { has: false }
    return this.service.has(user.id, productId)
  }
}
