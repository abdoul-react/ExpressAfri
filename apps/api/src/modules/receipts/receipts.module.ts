import { Module } from '@nestjs/common'
import { ReceiptsController } from './receipts.controller'
import { ReceiptsService } from './receipts.service'
import { ChatModule } from '../chat/chat.module'

@Module({
  imports: [ChatModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
