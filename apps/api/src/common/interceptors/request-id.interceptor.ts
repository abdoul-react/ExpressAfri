import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage<Map<string, any>>();

export function setLogContext(key: string, value: any) {
  requestContext.getStore()?.set(key, value);
}

export function getLogContext(): Record<string, any> {
  const store = requestContext.getStore();
  if (!store) return {};
  const ctx: Record<string, any> = {};
  for (const [key, value] of store) {
    ctx[key] = value;
  }
  return ctx;
}

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const store = new Map<string, any>();
    store.set('requestId', requestId);

    return requestContext.run(store, () => next.handle());
  }
}
