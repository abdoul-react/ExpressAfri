import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord — indicateurs clés' })
  async getDashboard(@Query('period') period?: string) {
    return this.service.getDashboard(period);
  }

  @Get('store-dashboard')
  @ApiOperation({ summary: 'Tableau de bord du gérant de boutique' })
  async getStoreDashboard(@CurrentUser() user: any) {
    if (!user?.storeId)
      throw new ForbiddenException('Réservé aux gérants de boutique');
    return this.service.getStoreDashboard(user.storeId);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Entonnoir de conversion' })
  async getFunnel() {
    return this.service.getFunnelData();
  }

  @Get('cohorts')
  @ApiOperation({ summary: 'Rétention par cohorte (6 mois glissants)' })
  async getCohorts() {
    return this.service.getCohortData();
  }

  @Get('abandoned-carts')
  @ApiOperation({ summary: 'Abandon de panier (30 jours)' })
  async getAbandonedCarts(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getAbandonedCartData(from, to);
  }
}
