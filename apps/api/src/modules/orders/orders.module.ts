import { Module } from '@nestjs/common'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { ChatModule } from '../chat/chat.module'
import { ReceiptsModule } from '../receipts/receipts.module'

@Module({
  imports: [ChatModule, ReceiptsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
