import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des signalements (admin)' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail signalement' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Soumettre un signalement' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour le statut' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string; resolution?: string }) {
    return this.service.updateStatus(id, body)
  }

  @Put(':id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assigner un signalement' })
  async assign(@Param('id') id: string, @Body() body: { adminId: string }) {
    return this.service.assign(id, body)
  }
}
