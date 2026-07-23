import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { AdminMessagesController } from './admin-messages.controller'
import { AdminMessagesService } from './admin-messages.service'
import { PushModule } from '../push/push.module'

@Module({
  imports: [DatabaseModule, PushModule],
  controllers: [AdminMessagesController],
  providers: [AdminMessagesService],
})
export class AdminMessagesModule {}
