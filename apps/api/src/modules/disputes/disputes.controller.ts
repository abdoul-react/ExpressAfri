import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DisputesService } from './disputes.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  constructor(private service: DisputesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des litiges' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un litige' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @ApiOperation({ summary: 'Créer un litige' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Put(':id/status')
  @ApiOperation({ summary: 'Changer le statut du litige' })
  async updateStatus(@Param('id') id: string, @Body() body: any) { return this.service.updateStatus(id, body.status, body) }

  @Put(':id/resolve')
  @ApiOperation({ summary: 'Résoudre un litige' })
  async resolve(@Param('id') id: string, @Body() body: any) { return this.service.resolve(id, body) }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Ajouter un message' })
  async addMessage(@Param('id') id: string, @Body() body: any) { return this.service.addMessage(id, body) }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Assigner un litige à un admin' })
  async assignToAdmin(@Param('id') id: string, @Body() body: any) { return this.service.assignToAdmin(id, body) }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un litige' })
  async delete(@Param('id') id: string) { return this.service.delete(id) }
}
