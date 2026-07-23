import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { ShippingService } from './shipping.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private service: ShippingService) {}

  @Get('zones')
  @ApiOperation({ summary: 'Liste des zones de livraison' })
  async listZones() { return this.service.listZones() }

  @Get('zones/:id')
  @ApiOperation({ summary: 'Détail d\'une zone' })
  async getZone(@Param('id') id: string) { return this.service.getZone(id) }

  @Post('zones')
  @ApiOperation({ summary: 'Créer une zone' })
  async createZone(@Body() body: any) { return this.service.createZone(body) }

  @Put('zones/:id')
  @ApiOperation({ summary: 'Modifier une zone' })
  async updateZone(@Param('id') id: string, @Body() body: any) { return this.service.updateZone(id, body) }

  @Delete('zones/:id')
  @ApiOperation({ summary: 'Supprimer une zone' })
  async deleteZone(@Param('id') id: string) { return this.service.deleteZone(id) }

  @Put('zones/:id/toggle')
  @ApiOperation({ summary: 'Activer/désactiver une zone' })
  async toggleZone(@Param('id') id: string, @Body('isActive') isActive: boolean) { return this.service.toggleZone(id, isActive) }

  @Get('methods')
  @ApiOperation({ summary: 'Liste des méthodes de livraison' })
  @ApiQuery({ name: 'zoneId', required: false })
  async listMethods(@Query('zoneId') zoneId?: string) { return this.service.listMethods(zoneId) }

  @Post('methods')
  @ApiOperation({ summary: 'Créer une méthode' })
  async createMethod(@Body() body: any) { return this.service.createMethod(body) }

  @Put('methods/:id')
  @ApiOperation({ summary: 'Modifier une méthode' })
  async updateMethod(@Param('id') id: string, @Body() body: any) { return this.service.updateMethod(id, body) }

  @Delete('methods/:id')
  @ApiOperation({ summary: 'Supprimer une méthode' })
  async deleteMethod(@Param('id') id: string) { return this.service.deleteMethod(id) }

  @Get('rules')
  @ApiOperation({ summary: 'Liste des règles de livraison' })
  @ApiQuery({ name: 'zoneId', required: false })
  async listRules(@Query('zoneId') zoneId?: string) { return this.service.listRules(zoneId) }

  @Post('rules')
  @ApiOperation({ summary: 'Créer une règle' })
  async createRule(@Body() body: any) { return this.service.createRule(body) }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Modifier une règle' })
  async updateRule(@Param('id') id: string, @Body() body: any) { return this.service.updateRule(id, body) }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Supprimer une règle' })
  async deleteRule(@Param('id') id: string) { return this.service.deleteRule(id) }
}
