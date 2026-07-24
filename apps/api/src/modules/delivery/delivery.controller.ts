import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Livraison')
@Controller('delivery')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private service: DeliveryService) {}

  @Get('persons')
  @ApiOperation({ summary: 'Liste des livreurs' })
  async listPersons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('countryCode') countryCode?: string,
    @Query('region') region?: string,
  ) {
    return this.service.listPersons({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      countryCode,
      region,
    });
  }

  @Get('persons/:id')
  @ApiOperation({ summary: "Détails d'un livreur" })
  async getPersonById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPersonById(id);
  }

  @Post('persons')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Créer un livreur' })
  async createPerson(@Body() body: any) {
    return this.service.createPerson(body);
  }

  @Put('persons/:id')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Modifier un livreur' })
  async updatePerson(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.service.updatePerson(id, body);
  }

  @Delete('persons/:id')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Supprimer un livreur' })
  async deletePerson(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deletePerson(id);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Liste des assignations' })
  async listAssignments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('deliveryPersonId') deliveryPersonId?: string,
  ) {
    return this.service.listAssignments({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      deliveryPersonId,
    });
  }

  @Post('assignments')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Assigner une commande' })
  async assignDelivery(
    @Body() body: { deliveryPersonId: string; orderId: string },
  ) {
    return this.service.assignDelivery(body);
  }

  @Put('assignments/:id/status')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Mettre à jour le statut' })
  async updateAssignmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.service.updateAssignmentStatus(id, body);
  }

  @Post('assignments/:id/rate')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Noter une livraison' })
  async rateAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { rating: number; notes?: string },
  ) {
    return this.service.rateAssignment(id, body);
  }

  @Get('available-orders')
  @ApiOperation({ summary: 'Commandes disponibles' })
  async listAvailableOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listAvailableOrders({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
