import { Controller, Get } from '@nestjs/common'
import { HealthService } from './health.service'
import { MetricsService } from '../common/logger/metrics.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  check() {
    return this.healthService.liveness()
  }

  @Get('readiness')
  async readiness() {
    return this.healthService.readiness()
  }

  @Get('metrics')
  getMetrics() {
    return this.metricsService.getMetrics()
  }
}
