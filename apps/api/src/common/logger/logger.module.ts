import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from '../interceptors/metrics.interceptor';

@Global()
@Module({
  providers: [
    AppLoggerService,
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [AppLoggerService, MetricsService],
})
export class AppLoggerModule {}
