import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PaymentsService } from './payments.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des paiements' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get(':id')
  @ApiOperation({ summary: 'Détail paiement' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @ApiOperation({ summary: 'Créer un paiement' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Rembourser un paiement' })
  async refund(@Param('id') id: string, @Body() body: any) { return this.service.refund(id, body) }
}
