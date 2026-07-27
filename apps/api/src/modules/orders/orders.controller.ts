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
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CustomerAuthGuard } from '../mobile/customer-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerRoute } from '../../common/decorators/customer-route.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  // Un gérant ne voit et ne touche que les commandes de SA boutique.
  private async assertOrderAccess(orderId: string, user: any) {
    if (!user?.storeId) return;
    const order = await this.service.getById(orderId);
    if (!order || order.storeId !== user.storeId) {
      throw new UnauthorizedException(
        'Cette commande appartient à une autre boutique',
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des commandes (admin)' })
  async list(
    @Query() query: any,
    @Query('customerId') customerId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: any,
  ) {
    if (user?.storeId) query = { ...query, storeId: user.storeId };
    return this.service.list({ ...query, customerId, dateFrom, dateTo });
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer une commande (checkout mobile — client authentifié requis)',
  })
  async create(@Body() body: any, @CurrentUser() user: any) {
    // Un client authentifié est requis : une commande anonyme (customerId NULL)
    // serait invisible dans « Mes commandes » (mobileList filtre par customerId)
    if (!user?.id)
      throw new UnauthorizedException(
        'Connexion requise pour passer une commande',
      );
    return this.service.createFromCheckout(body, user.id);
  }

  @Get('mobile/list')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste commandes (mobile)' })
  async mobileList(@Query('status') status: string, @CurrentUser() user: any) {
    // Sans client authentifié, aucune commande à retourner (évite eq(col, undefined) → 500)
    if (!user?.id) return [];
    return this.service.mobileList(user.id, status);
  }

  @Get('mobile/:id/tracking')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Suivi de livraison en temps réel (chronologie + livreur)',
  })
  async mobileTracking(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.mobileTracking(user.id, id);
  }

  // Route statique déclarée AVANT :id, sinon "mobile" serait capturé comme un id
  @Get('mobile/:id')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail commande (mobile, format app)' })
  async mobileGetById(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.mobileGetById(user.id, id);
  }

  @Post('mobile/:id/cancel')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une commande (client mobile)' })
  async mobileCancelOrder(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.mobileCancelOrder(user.id, id);
  }

  @Delete('mobile/:id')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer une commande de l\'historique (client mobile)' })
  async mobileDeleteOrder(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.mobileDeleteOrder(user.id, id);
  }

  @Post('mobile/:id/pay')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payer une commande existante (client mobile)' })
  async mobilePayOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { paymentMethod: string; phoneNumber?: string },
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.mobilePayOrder(user.id, id, body.paymentMethod, body.phoneNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail commande (admin)' })
  async getById(@Param('id') id: string, @CurrentUser() user: any) {
    await this.assertOrderAccess(id, user);
    return this.service.getById(id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Changer le statut d'une commande" })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @CurrentUser() user: any,
  ) {
    await this.assertOrderAccess(id, user);
    return this.service.updateStatus(id, body.status, user?.id, body.reason);
  }

  @Post(':id/shipments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une expédition partielle' })
  async createShipment(
    @Param('id') orderId: string,
    @Body()
    body: {
      items: { orderItemId: string; quantity: number }[];
      trackingNumber?: string;
      deliveryPersonId?: string;
      notes?: string;
    },
    @CurrentUser() user: any,
  ) {
    await this.assertOrderAccess(orderId, user);
    return this.service.createShipment(orderId, body);
  }

  @Put(':id/items/:itemId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Changer le statut d'un item individuellement" })
  async updateItemStatus(
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: { status: string; issueReason?: string },
    @CurrentUser() user: any,
  ) {
    await this.assertOrderAccess(orderId, user);
    return this.service.updateItemStatus(orderId, itemId, body);
  }

  @Get(':id/shipments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lister les expéditions d'une commande" })
  async listShipments(@Param('id') orderId: string, @CurrentUser() user: any) {
    await this.assertOrderAccess(orderId, user);
    return this.service.listShipments(orderId);
  }
}
