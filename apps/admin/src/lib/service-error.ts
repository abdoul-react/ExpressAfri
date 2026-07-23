import { ValidationError } from './validate'

export class ServiceError extends Error {
  type: 'validation' | 'api' | 'network' | 'unknown'
  statusCode?: number

  constructor(
    message: string,
    options: { type: ServiceError['type']; statusCode?: number; cause?: unknown },
  ) {
    super(message)
    this.name = 'ServiceError'
    this.type = options.type
    this.statusCode = options.statusCode
    this.cause = options.cause
  }
}

export function toServiceError(err: unknown, context: string): Error {
  if (err instanceof ValidationError || err instanceof ServiceError) return err

  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
    const status = axiosErr.response?.status
    const serverMsg = axiosErr.response?.data?.message
    const msg = serverMsg ?? (status ? `Erreur API (${status})` : 'Erreur API inconnue')
    return new ServiceError(`${context} : ${msg}`, { type: 'api', statusCode: status, cause: err })
  }

  if (err instanceof TypeError || (err && typeof err === 'object' && (err as any)?.code === 'ERR_NETWORK')) {
    return new ServiceError(`${context} : erreur réseau`, { type: 'network', cause: err })
  }

  const msg = err instanceof Error ? err.message : 'Erreur inconnue'
  return new ServiceError(`${context} : ${msg}`, { type: 'unknown', cause: err })
}
