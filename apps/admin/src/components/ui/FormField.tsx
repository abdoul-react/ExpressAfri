import { cn } from '../../lib/cn'

export interface FormFieldProps {
  label: React.ReactNode
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

/** Standardise la mise en page label / champ / erreur / indication des formulaires. */
export function FormField({ label, htmlFor, required, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  )
}
