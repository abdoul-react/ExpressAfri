import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AppLoggerModule } from './common/logger/logger.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { CustomersModule } from './modules/customers/customers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ContentModule } from './modules/content/content.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AuditModule } from './modules/audit/audit.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ChatModule } from './modules/chat/chat.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { AdminMessagesModule } from './modules/admin-messages/admin-messages.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './common/mail/mail.module';
@Module({
  imports: [
    AppLoggerModule,
    RedisModule,
    MailModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        customProps: (req) => ({
          requestId: (req as any)['requestId'] || req.id,
        }),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            'req.body.cardNumber',
            'req.body.cvv',
            'req.body.phone',
            'req.body.email',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    StoresModule,
    ProductsModule,
    CouponsModule,
    AffiliatesModule,
    OrdersModule,
    AnalyticsModule,
    PaymentsModule,
    ReturnsModule,
    PayoutsModule,
    CustomersModule,
    NotificationsModule,
    LoyaltyModule,
    ContentModule,
    ReviewsModule,
    CampaignsModule,
    ReceiptsModule,
    ReportsModule,
    DisputesModule,
    AuditModule,
    DeliveryModule,
    ShippingModule,
    MobileModule,
    SettingsModule,
    WishlistModule,
    ChatModule,
    AdminMessagesModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
