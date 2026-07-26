import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { StoreGroupsController } from './store-groups.controller';
import { StoreGroupsService } from './store-groups.service';
import { StorePaymentMethodsService } from './store-payment-methods.service';

@Module({
  controllers: [StoresController, StoreGroupsController],
  providers: [StoresService, StoreGroupsService, StorePaymentMethodsService],
  exports: [StoresService, StorePaymentMethodsService],
})
export class StoresModule {}
