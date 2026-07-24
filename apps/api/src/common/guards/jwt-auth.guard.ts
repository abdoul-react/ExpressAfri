import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_CUSTOMER_KEY } from '../decorators/customer-route.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    // Routes clientes (mobile) : l'auth est gérée par CustomerAuthGuard,
    // le guard admin global ne doit pas les bloquer.
    const isCustomer = this.reflector.getAllAndOverride<boolean>(
      IS_CUSTOMER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isCustomer) return true;
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user)
      throw err || new UnauthorizedException('Authentification requise');
    return user;
  }
}
