import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Les versements sont l'argent dû aux boutiques : lecture réservée à
// `commissions.read` (même permission que le lien « Versements » du
// back-office), toute mutation à `commissions.approve` (rôle Finance).
@ApiTags('Payouts')
@Controller('payouts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PayoutsController {
  constructor(private service: PayoutsService) {}

  @Get('summary')
  @Permissions('commissions.read')
  @ApiOperation({ summary: 'Résumé des versements' })
  async getSummary() {
    return this.service.getSummary();
  }

  @Get()
  @Permissions('commissions.read')
  @ApiOperation({ summary: 'Liste des versements' })
  async list(@Query() query: any) {
    return this.service.list(query);
  }

  @Get(':id')
  @Permissions('commissions.read')
  @ApiOperation({ summary: 'Détail versement' })
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Permissions('commissions.approve')
  @ApiOperation({ summary: 'Créer un versement' })
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':id/process')
  @Permissions('commissions.approve')
  @ApiOperation({ summary: 'Traiter un versement' })
  async process(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.service.process(id, admin?.id ?? '');
  }

  @Put(':id/mark-paid')
  @Permissions('commissions.approve')
  @ApiOperation({ summary: 'Marquer comme payé' })
  async markAsPaid(
    @Param('id') id: string,
    @Body() body: { paymentReference: string; paidAt?: string; notes?: string },
  ) {
    return this.service.markAsPaid(id, body);
  }

  @Put(':id/cancel')
  @Permissions('commissions.approve')
  @ApiOperation({ summary: 'Annuler un versement' })
  async cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.service.cancel(id, reason);
  }
}
