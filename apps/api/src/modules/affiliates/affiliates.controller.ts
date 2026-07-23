import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AffiliatesService } from './affiliates.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Affiliates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('affiliates')
export class AffiliatesController {
  constructor(private service: AffiliatesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des affiliés' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get('summary')
  @ApiOperation({ summary: 'Résumé global des affiliés' })
  async getSummary() { return this.service.getSummary() }

  @Get(':id')
  @ApiOperation({ summary: 'Détail affilié' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @ApiOperation({ summary: 'Créer un affilié' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un affilié' })
  async update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }

  @Put(':id/status')
  @ApiOperation({ summary: 'Changer le statut' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(id, body.status) }

  @Get(':id/coupons')
  @ApiOperation({ summary: 'Coupons liés à l\'affilié' })
  async getCoupons(@Param('id') id: string, @Query() query: any) { return this.service.getCoupons(id, query) }

  @Get('commissions/list')
  @ApiOperation({ summary: 'Liste des commissions' })
  async listCommissions(@Query() query: any) { return this.service.listCommissions(query) }

  @Put('commissions/:id/approve')
  @ApiOperation({ summary: 'Approuver une commission' })
  async approveCommission(@Param('id') id: string) { return this.service.approveCommission(id) }

  @Put('commissions/:id/reject')
  @ApiOperation({ summary: 'Rejeter une commission' })
  async rejectCommission(@Param('id') id: string) { return this.service.rejectCommission(id) }
}
