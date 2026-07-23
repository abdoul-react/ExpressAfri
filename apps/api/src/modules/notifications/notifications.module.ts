import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { OrderEventsListener } from './order-events.listener'
import { ChatModule } from '../chat/chat.module'

@Module({
  imports: [ChatModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, OrderEventsListener],
  exports: [NotificationsService, OrderEventsListener],
})
export class NotificationsModule {}
