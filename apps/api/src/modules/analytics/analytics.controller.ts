import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord — indicateurs clés' })
  async getDashboard(@Query('period') period?: string) {
    return this.service.getDashboard(period)
  }
}
