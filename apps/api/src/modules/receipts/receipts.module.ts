import { Module } from '@nestjs/common';
import {
  ReceiptsController,
  MobileReceiptsController,
} from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ChatModule } from '../chat/chat.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ChatModule, StorageModule, AuditModule],
  controllers: [ReceiptsController, MobileReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
