import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common'
import { getLogContext } from '../interceptors/request-id.interceptor'

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private get context(): Record<string, any> {
    return getLogContext()
  }

  log(message: any, ...optionalParams: any[]) {
    const ctx = this.context
    if (ctx.requestId) {
      console.log(JSON.stringify({ level: 'info', message, ...ctx, ...this.parseParams(optionalParams) }))
    } else {
      console.log(message, ...optionalParams)
    }
  }

  error(message: any, ...optionalParams: any[]) {
    const ctx = this.context
    if (ctx.requestId) {
      console.error(JSON.stringify({ level: 'error', message, ...ctx, ...this.parseParams(optionalParams) }))
    } else {
      console.error(message, ...optionalParams)
    }
  }

  warn(message: any, ...optionalParams: any[]) {
    const ctx = this.context
    if (ctx.requestId) {
      console.warn(JSON.stringify({ level: 'warn', message, ...ctx, ...this.parseParams(optionalParams) }))
    } else {
      console.warn(message, ...optionalParams)
    }
  }

  debug(message: any, ...optionalParams: any[]) {
    const ctx = this.context
    if (ctx.requestId) {
      console.debug(JSON.stringify({ level: 'debug', message, ...ctx, ...this.parseParams(optionalParams) }))
    } else {
      console.debug(message, ...optionalParams)
    }
  }

  verbose(message: any, ...optionalParams: any[]) {
    const ctx = this.context
    if (ctx.requestId) {
      console.log(JSON.stringify({ level: 'verbose', message, ...ctx, ...this.parseParams(optionalParams) }))
    } else {
      console.log(message, ...optionalParams)
    }
  }

  private parseParams(params: any[]): Record<string, any> {
    if (params.length === 0) return {}
    if (params.length === 1 && typeof params[0] === 'object') return params[0]
    return { context: params[0] }
  }
}
