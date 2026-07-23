import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  placeholderSelectable?: boolean
  id?: string
  name?: string
  size?: 'sm' | 'md'
}

export const SELECT_BASE_CLS =
  'rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ value, onChange, options, placeholder, disabled = false, className = '', placeholderSelectable = true, id, name, size = 'md' }, ref) => {
    const sizeCls = size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5'

    return (
      <select
        ref={ref}
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(SELECT_BASE_CLS, sizeCls, className)}
      >
        {placeholder !== undefined && (
          <option value="" disabled={!placeholderSelectable} className="text-gray-400 dark:text-gray-500">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  },
)
Select.displayName = 'Select'
