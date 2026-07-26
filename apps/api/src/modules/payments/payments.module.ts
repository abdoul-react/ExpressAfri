import { Module, OnModuleInit } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentWebhookService } from './payment-webhook.service';
import { GatewayRegistryService } from './gateway-registry.service';
import { GatewaysController } from './gateways.controller';
import { GatewaysService } from './gateways.service';
import { MockAdapter } from './providers/adapters/mock.adapter';
import { CinetpayAdapter } from './providers/adapters/cinetpay.adapter';
import { PaydunyaAdapter } from './providers/adapters/paydunya.adapter';
import { FlutterwaveAdapter } from './providers/adapters/flutterwave.adapter';
import { PaystackAdapter } from './providers/adapters/paystack.adapter';
import { StripeAdapter } from './providers/adapters/stripe.adapter';
import { OrangeMoneyAdapter } from './providers/adapters/orange-money.adapter';
import { WaveAdapter } from './providers/adapters/wave.adapter';
import { MtnMomoAdapter } from './providers/adapters/mtn-momo.adapter';
import { ChatModule } from '../chat/chat.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ChatModule, AuditModule],
  controllers: [PaymentsController, GatewaysController],
  providers: [
    PaymentsService,
    PaymentWebhookService,
    GatewayRegistryService,
    GatewaysService,
  ],
  exports: [PaymentsService, PaymentWebhookService, GatewayRegistryService],
})
export class PaymentsModule implements OnModuleInit {
  constructor(private registry: GatewayRegistryService) {}

  onModuleInit() {
    // Tous les adaptateurs sont enregistrés au boot — activer une passerelle
    // est une décision de DONNÉES (payment_gateways.is_enabled + clés), pas
    // de code : le registre refuse toute passerelle non configurée.
    this.registry.register(new MockAdapter());
    this.registry.register(new CinetpayAdapter());
    this.registry.register(new PaydunyaAdapter());
    this.registry.register(new FlutterwaveAdapter());
    this.registry.register(new PaystackAdapter());
    this.registry.register(new StripeAdapter());
    this.registry.register(new OrangeMoneyAdapter());
    this.registry.register(new WaveAdapter());
    this.registry.register(new MtnMomoAdapter());
  }
}
