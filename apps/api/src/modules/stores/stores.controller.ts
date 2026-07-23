import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { StoresService } from './stores.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
  constructor(private service: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des boutiques' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async list(@Query() query: any, @CurrentUser() user: any) {
    // Gérant de boutique : la liste ne contient que SA boutique
    if (user?.storeId) {
      const store = await this.service.getById(user.storeId)
      return { data: store ? [store] : [], total: store ? 1 : 0, page: 1 }
    }
    return this.service.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail boutique' })
  async getById(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.storeId && id !== user.storeId) {
      throw new ForbiddenException('Vous ne gérez pas cette boutique')
    }
    return this.service.getById(id)
  }

  @Post()
  @ApiOperation({ summary: 'Créer boutique' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    if (user?.storeId) throw new ForbiddenException('Un gérant ne peut pas créer de boutique')
    return this.service.create(body)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier boutique' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    if (user?.storeId) {
      if (id !== user.storeId) throw new ForbiddenException('Vous ne gérez pas cette boutique')
      // Un gérant ne change ni le statut ni la commission de sa boutique
      const { status: _s, commissionRate: _c, ...allowed } = body ?? {}
      return this.service.update(id, allowed)
    }
    return this.service.update(id, body)
  }

  // ====== GÉRANTS ======
  // Réservé à la plateforme : un gérant ne gère pas les comptes gérants.

  @Get(':id/managers')
  @ApiOperation({ summary: 'Gérants de la boutique' })
  async listManagers(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.storeId) throw new ForbiddenException('Réservé à l\'équipe AfriExpress')
    return this.service.listManagers(id)
  }

  @Post(':id/managers')
  @ApiOperation({ summary: 'Créer un compte gérant pour la boutique' })
  async createManager(
    @Param('id') id: string,
    @Body() body: { email: string; name: string; password: string },
    @CurrentUser() user: any,
  ) {
    if (user?.storeId) throw new ForbiddenException('Réservé à l\'équipe AfriExpress')
    return this.service.createManager(id, body)
  }

  @Put(':id/managers/:managerId/active')
  @ApiOperation({ summary: 'Activer/désactiver un gérant' })
  async setManagerActive(
    @Param('id') id: string,
    @Param('managerId') managerId: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: any,
  ) {
    if (user?.storeId) throw new ForbiddenException('Réservé à l\'équipe AfriExpress')
    return this.service.setManagerActive(id, managerId, body.isActive)
  }

  @Put(':id/managers/:managerId/password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe d\'un gérant' })
  async resetManagerPassword(
    @Param('id') id: string,
    @Param('managerId') managerId: string,
    @Body() body: { password: string },
    @CurrentUser() user: any,
  ) {
    if (user?.storeId) throw new ForbiddenException('Réservé à l\'équipe AfriExpress')
    return this.service.resetManagerPassword(id, managerId, body.password)
  }

  @Get(':id/kyc')
  @ApiOperation({ summary: 'Documents KYC de la boutique' })
  async getKyc(@Param('id') id: string) { return this.service.getKyc(id) }

  @Put(':id/kyc')
  @ApiOperation({ summary: 'Mettre à jour les documents KYC' })
  async upsertKyc(@Param('id') id: string, @Body() body: any) { return this.service.upsertKyc(id, body) }

  @Put(':id/kyc/approve')
  @ApiOperation({ summary: 'Approuver KYC' })
  async approveKyc(@Param('id') id: string, @CurrentUser() user: any) { return this.service.approveKyc(id, user.id) }

  @Put(':id/kyc/reject')
  @ApiOperation({ summary: 'Rejeter KYC' })
  async rejectKyc(@Param('id') id: string, @CurrentUser() user: any) { return this.service.rejectKyc(id, user.id) }
}
