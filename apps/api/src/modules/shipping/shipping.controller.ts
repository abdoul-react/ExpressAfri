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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private service: ShippingService) {}

  // Gérant de boutique : `storeId` vient du jeton et borne chaque requête à
  // ses propres zones (plus les zones globales de la plateforme, en lecture).
  // Admin plateforme : `undefined` → périmètre complet.

  @Get('zones')
  @ApiOperation({ summary: 'Liste des zones de livraison' })
  async listZones(@CurrentUser() user: any) {
    return this.service.listZones(user?.storeId ?? undefined);
  }

  @Get('zones/:id')
  @ApiOperation({ summary: "Détail d'une zone" })
  async getZone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getZone(id, user?.storeId ?? undefined);
  }

  @Post('zones')
  @Permissions('shipping.create')
  @ApiOperation({ summary: 'Créer une zone' })
  async createZone(@Body() body: any, @CurrentUser() user: any) {
    return this.service.createZone(body, user?.storeId ?? undefined);
  }

  @Put('zones/:id')
  @Permissions('shipping.update')
  @ApiOperation({ summary: 'Modifier une zone' })
  async updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateZone(id, body, user?.storeId ?? undefined);
  }

  @Delete('zones/:id')
  @Permissions('shipping.delete')
  @ApiOperation({ summary: 'Supprimer une zone' })
  async deleteZone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteZone(id, user?.storeId ?? undefined);
  }

  @Put('zones/:id/toggle')
  @Permissions('shipping.update')
  @ApiOperation({ summary: 'Activer/désactiver une zone' })
  async toggleZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() user: any,
  ) {
    return this.service.toggleZone(id, isActive, user?.storeId ?? undefined);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Liste des méthodes de livraison' })
  @ApiQuery({ name: 'zoneId', required: false })
  async listMethods(@CurrentUser() user: any, @Query('zoneId') zoneId?: string) {
    return this.service.listMethods(zoneId, user?.storeId ?? undefined);
  }

  @Post('methods')
  @Permissions('shipping.create')
  @ApiOperation({ summary: 'Créer une méthode' })
  async createMethod(@Body() body: any, @CurrentUser() user: any) {
    return this.service.createMethod(body, user?.storeId ?? undefined);
  }

  @Put('methods/:id')
  @Permissions('shipping.update')
  @ApiOperation({ summary: 'Modifier une méthode' })
  async updateMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateMethod(id, body, user?.storeId ?? undefined);
  }

  @Delete('methods/:id')
  @Permissions('shipping.delete')
  @ApiOperation({ summary: 'Supprimer une méthode' })
  async deleteMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteMethod(id, user?.storeId ?? undefined);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Liste des règles de livraison' })
  @ApiQuery({ name: 'zoneId', required: false })
  async listRules(@CurrentUser() user: any, @Query('zoneId') zoneId?: string) {
    return this.service.listRules(zoneId, user?.storeId ?? undefined);
  }

  @Post('rules')
  @Permissions('shipping.create')
  @ApiOperation({ summary: 'Créer une règle' })
  async createRule(@Body() body: any, @CurrentUser() user: any) {
    return this.service.createRule(body, user?.storeId ?? undefined);
  }

  @Put('rules/:id')
  @Permissions('shipping.update')
  @ApiOperation({ summary: 'Modifier une règle' })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateRule(id, body, user?.storeId ?? undefined);
  }

  @Delete('rules/:id')
  @Permissions('shipping.delete')
  @ApiOperation({ summary: 'Supprimer une règle' })
  async deleteRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteRule(id, user?.storeId ?? undefined);
  }
}
