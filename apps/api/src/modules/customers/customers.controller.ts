import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CustomersService } from './customers.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Permissions } from '../../common/decorators/permissions.decorator'

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des clients' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques clients' })
  async stats() { return this.service.getStats() }

  @Get(':id')
  @ApiOperation({ summary: 'Détail client' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post()
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Créer un client' })
  async create(@Body() body: any) { return this.service.create(body) }

  @Put(':id')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Modifier un client' })
  async update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }

  @Delete(':id')
  @Permissions('customers.delete')
  @ApiOperation({ summary: 'Supprimer un client (soft-delete : désactivation)' })
  async delete(@Param('id') id: string) { return this.service.delete(id) }

  // ── Addresses ──

  @Get(':id/addresses')
  @ApiOperation({ summary: 'Adresses du client' })
  async listAddresses(@Param('id') id: string) { return this.service.listAddresses(id) }

  @Post(':id/addresses')
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Ajouter une adresse' })
  async createAddress(@Param('id') id: string, @Body() body: any) { return this.service.createAddress(id, body) }

  @Put(':id/addresses/:addrId')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Modifier une adresse' })
  async updateAddress(@Param('id') id: string, @Param('addrId') addrId: string, @Body() body: any) {
    return this.service.updateAddress(addrId, id, body)
  }

  @Put(':id/addresses/:addrId/default')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Définir une adresse par défaut' })
  async setDefaultAddress(@Param('id') id: string, @Param('addrId') addrId: string) {
    return this.service.setDefaultAddress(addrId, id)
  }

  @Delete(':id/addresses/:addrId')
  @Permissions('customers.delete')
  @ApiOperation({ summary: 'Supprimer une adresse' })
  async deleteAddress(@Param('id') id: string, @Param('addrId') addrId: string) {
    return this.service.deleteAddress(addrId, id)
  }
}
