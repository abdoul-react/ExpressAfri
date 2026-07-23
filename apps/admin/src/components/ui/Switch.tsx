import { forwardRef } from 'react'
import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '../../lib/cn'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  id?: string
  className?: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, label, disabled, id, className }, ref) => {
    const control = (
      <RadixSwitch.Root
        ref={ref}
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={!label ? 'Basculer' : undefined}
        className={cn(
          'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700',
          disabled && 'cursor-not-allowed opacity-50',
          !label && className,
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            'block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform',
            'data-[state=checked]:translate-x-[22px]',
          )}
        />
      </RadixSwitch.Root>
    )

    if (!label) return control

    return (
      <label
        className={cn(
          'flex cursor-pointer select-none items-center gap-3 text-sm text-gray-700 dark:text-gray-300',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        {control}
        {label}
      </label>
    )
  },
)
Switch.displayName = 'Switch'
