import { Module, OnModuleInit } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentWebhookService } from './payment-webhook.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { ChatModule } from '../chat/chat.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ChatModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentWebhookService, MockPaymentProvider],
  exports: [PaymentsService, PaymentWebhookService],
})
export class PaymentsModule implements OnModuleInit {
  constructor(
    private webhookService: PaymentWebhookService,
    private mockProvider: MockPaymentProvider,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      this.webhookService.registerProvider(this.mockProvider);
    }
  }
}
