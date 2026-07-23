import { forwardRef } from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  id?: string
  className?: string
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onCheckedChange, label, disabled, id, className }, ref) => {
    const box = (
      <RadixCheckbox.Root
        ref={ref}
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-label={!label ? undefined : undefined}
        className={cn(
          'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border transition-colors',
          checked
            ? 'border-primary-500 bg-primary-500 text-white'
            : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900',
          disabled && 'cursor-not-allowed opacity-50',
          !label && className,
        )}
      >
        <RadixCheckbox.Indicator>
          <Check className="h-3 w-3" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
    )

    if (!label) return box

    return (
      <label
        className={cn(
          'flex cursor-pointer select-none items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        {box}
        {label}
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'
