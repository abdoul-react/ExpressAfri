import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { MetricsService } from '../logger/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    const response = context.switchToHttp().getResponse();

    response.on('finish', () => {
      this.metrics.recordRequest(response.statusCode, Date.now() - start);
    });

    return next.handle();
  }
}
