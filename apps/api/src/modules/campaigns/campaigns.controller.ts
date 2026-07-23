import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CampaignsService } from './campaigns.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private service: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des campagnes' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get(':id')
  @ApiOperation({ summary: 'Détail campagne' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @ApiOperation({ summary: 'Créer une campagne' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une campagne' })
  async update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une campagne' })
  async delete(@Param('id') id: string) { return this.service.delete(id) }
}
