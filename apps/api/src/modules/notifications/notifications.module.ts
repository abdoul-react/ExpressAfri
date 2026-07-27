import { Module, OnModuleInit } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';
import { SmsService } from './sms/sms.service';
import { SmsGatewaysController } from './sms/sms-gateways.controller';
import { TwilioSmsAdapter } from './sms/adapters/twilio.adapter';
import { AfricasTalkingSmsAdapter } from './sms/adapters/africas-talking.adapter';
import { OrangeSmsAdapter } from './sms/adapters/orange-sms.adapter';
import { MockSmsAdapter } from './sms/adapters/mock-sms.adapter';
import { ChatModule } from '../chat/chat.module';
import { PushModule } from '../push/push.module';

const providers: any[] = [NotificationsService, OutboxService, SmsService];
if (process.env.NODE_ENV !== 'test') {
  providers.push(OutboxWorker);
}

@Module({
  imports: [ChatModule, PushModule],
  controllers: [NotificationsController, SmsGatewaysController],
  providers,
  exports: [NotificationsService, OutboxService, SmsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private sms: SmsService) {}

  onModuleInit() {
    // Tous les fournisseurs enregistrés au boot ; activer l'un d'eux est une
    // décision de DONNÉES (sms_gateways.is_enabled + clés), pas de code.
    this.sms.register(new MockSmsAdapter());
    this.sms.register(new TwilioSmsAdapter());
    this.sms.register(new AfricasTalkingSmsAdapter());
    this.sms.register(new OrangeSmsAdapter());
  }
}
