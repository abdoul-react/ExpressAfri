import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { OutboxService } from './outbox.service'
import { OutboxWorker } from './outbox.worker'
import { ChatModule } from '../chat/chat.module'
import { PushModule } from '../push/push.module'

const providers = [NotificationsService, OutboxService]
if (process.env.NODE_ENV !== 'test') {
  providers.push(OutboxWorker)
}

@Module({
  imports: [ChatModule, PushModule],
  controllers: [NotificationsController],
  providers,
  exports: [NotificationsService, OutboxService],
})
export class NotificationsModule {}
