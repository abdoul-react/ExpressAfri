import { Module } from '@nestjs/common'
import { ReceiptsController, MobileReceiptsController } from './receipts.controller'
import { ReceiptsService } from './receipts.service'
import { ChatModule } from '../chat/chat.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [ChatModule, StorageModule],
  controllers: [ReceiptsController, MobileReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
