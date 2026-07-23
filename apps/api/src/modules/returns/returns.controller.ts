import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ReturnsService } from './returns.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CustomerAuthGuard } from '../mobile/customer-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CustomerRoute } from '../../common/decorators/customer-route.decorator'

@ApiTags('Returns')
@Controller('returns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private service: ReturnsService) {}

  // ── Routes clientes (mobile) — déclarées AVANT :id pour éviter la capture ──

  @Get('mobile/list')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Retours du client connecté' })
  async mobileList(@CurrentUser() user: any) {
    if (!user?.id) return []
    return this.service.mobileList(user.id)
  }

  @Post('mobile')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Créer une demande de retour (client)' })
  async mobileCreate(
    @CurrentUser() user: any,
    @Body() body: { orderId: string; reason: string; items?: { productId: string; quantity: number }[] },
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    if (!body?.orderId) throw new BadRequestException('orderId requis')
    if (!body?.reason?.trim()) throw new BadRequestException('Le motif est requis')
    return this.service.mobileCreate(user.id, body)
  }

  // ── Routes admin ──

  @Get()
  @ApiOperation({ summary: 'Liste des retours' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get(':id')
  @ApiOperation({ summary: 'Détail retour' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @ApiOperation({ summary: 'Créer un retour' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Put(':id/status')
  @ApiOperation({ summary: 'Changer le statut du retour' })
  async updateStatus(@Param('id') id: string, @Body() body: any) { return this.service.updateStatus(id, body.status, body) }
}
