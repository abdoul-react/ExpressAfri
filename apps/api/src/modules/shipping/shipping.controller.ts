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

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private service: ShippingService) {}

  @Get('zones')
  @ApiOperation({ summary: 'Liste des zones de livraison' })
  async listZones() {
    return this.service.listZones();
  }

  @Get('zones/:id')
  @ApiOperation({ summary: "Détail d'une zone" })
  async getZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getZone(id);
  }

  @Post('zones')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Créer une zone' })
  async createZone(@Body() body: any) {
    return this.service.createZone(body);
  }

  @Put('zones/:id')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Modifier une zone' })
  async updateZone(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.service.updateZone(id, body);
  }

  @Delete('zones/:id')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Supprimer une zone' })
  async deleteZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteZone(id);
  }

  @Put('zones/:id/toggle')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Activer/désactiver une zone' })
  async toggleZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.service.toggleZone(id, isActive);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Liste des méthodes de livraison' })
  @ApiQuery({ name: 'zoneId', required: false })
  async listMethods(@Query('zoneId') zoneId?: string) {
    return this.service.listMethods(zoneId);
  }

  @Post('methods')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Créer une méthode' })
  async createMethod(@Body() body: any) {
    return this.service.createMethod(body);
  }

  @Put('methods/:id')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Modifier une méthode' })
  async updateMethod(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.service.updateMethod(id, body);
  }

  @Delete('methods/:id')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Supprimer une méthode' })
  async deleteMethod(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteMethod(id);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Liste des règles de livraison' })
  @ApiQuery({ name: 'zoneId', required: false })
  async listRules(@Query('zoneId') zoneId?: string) {
    return this.service.listRules(zoneId);
  }

  @Post('rules')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Créer une règle' })
  async createRule(@Body() body: any) {
    return this.service.createRule(body);
  }

  @Put('rules/:id')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Modifier une règle' })
  async updateRule(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.service.updateRule(id, body);
  }

  @Delete('rules/:id')
  @Permissions('shipping.manage')
  @ApiOperation({ summary: 'Supprimer une règle' })
  async deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteRule(id);
  }
}
