import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { CouponsService } from './coupons.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private service: CouponsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des coupons (admin)' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get('by-code/:code')
  @Public()
  @ApiOperation({ summary: 'Trouver un coupon par code (checkout)' })
  async getByCode(@Param('code') code: string) { return this.service.getByCode(code) }

  @Post(':code/validate')
  @Public()
  @ApiOperation({ summary: 'Valider un code promo (checkout)' })
  async validate(@Param('code') code: string, @Body() body: { customerEmail?: string; orderAmount?: number }) {
    return this.service.validate(code, body.customerEmail, body.orderAmount)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail coupon' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un coupon' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un coupon' })
  async update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un coupon' })
  async delete(@Param('id') id: string) { return this.service.delete(id) }
}
