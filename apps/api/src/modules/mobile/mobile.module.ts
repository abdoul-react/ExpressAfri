import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { CustomerJwtStrategy } from './customer-jwt.strategy';
import { CustomersModule } from '../customers/customers.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'customer-jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'secret',
        signOptions: { expiresIn: '30d' },
      }),
    }),
    MulterModule.register({}),
    CustomersModule,
    PushModule,
  ],
  controllers: [MobileController],
  providers: [MobileService, CustomerJwtStrategy],
  exports: [MobileService],
})
export class MobileModule {}
