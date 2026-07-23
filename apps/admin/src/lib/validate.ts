import { type ZodType, type ZodError } from 'zod'

export class ValidationError extends Error {
  fields: Record<string, string>

  constructor(zodError: ZodError) {
    super(zodError.message)
    this.name = 'ValidationError'
    this.fields = Object.fromEntries(
      zodError.errors.map((e) => [e.path.join('.'), e.message]),
    )
  }
}

export function validateOrThrow<T extends ZodType<any>>(schema: T, data: unknown): ReturnType<T['parse']> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ValidationError(result.error)
  }
  return result.data as ReturnType<T['parse']>
}
