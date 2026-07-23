import { useState, useCallback } from 'react'
import { ValidationError } from './validate'

export interface FormErrors {
  [field: string]: string
}

export function useFormErrors() {
  const [errors, setErrors] = useState<FormErrors>({})

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const getError = useCallback(
    (field: string): string | undefined => errors[field],
    [errors],
  )

  const handleValidationError = useCallback((error: unknown) => {
    if (error instanceof ValidationError) {
      setErrors((prev) => ({ ...prev, ...error.fields }))
      return true
    }
    return false
  }, [])

  const hasErrors = Object.keys(errors).length > 0

  return { errors, setError, clearErrors, clearError, getError, handleValidationError, hasErrors }
}
