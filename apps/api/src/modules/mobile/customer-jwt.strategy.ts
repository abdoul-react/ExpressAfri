import { Injectable, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { eq } from 'drizzle-orm';
import { customers } from '../../database/schema/customers';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt',
) {
  constructor(
    config: ConfigService,
    @Inject(DRIZZLE) private db: DrizzleDB,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'secret',
    });
  }

  async validate(payload: { sub: string; email: string; type: string }) {
    if (payload.type !== 'customer') throw new UnauthorizedException();
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, payload.sub))
      .limit(1);
    if (!customer) throw new UnauthorizedException();
    if (customer.isBanned) throw new ForbiddenException('Account suspended');
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      isGuest: customer.isGuest,
    };
  }
}
