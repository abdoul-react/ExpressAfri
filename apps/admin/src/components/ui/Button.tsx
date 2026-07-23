import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  asChild?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary-500 text-white shadow-sm hover:bg-primary-600 active:bg-primary-700 disabled:hover:bg-primary-500',
  secondary:
    'bg-gray-900 text-white shadow-sm hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white',
  outline:
    'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:hover:bg-red-600',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-11 gap-2 rounded-lg px-5 text-sm',
  icon: 'h-9 w-9 rounded-lg',
}

const ICON_SIZES: Record<Size, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
  icon: 'h-4 w-4',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    asChild = false,
    className,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const classes = cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <Loader2 className={cn(ICON_SIZES[size], 'animate-spin')} />
      ) : (
        LeftIcon && <LeftIcon className={ICON_SIZES[size]} />
      )}
      {children}
      {RightIcon && !loading && <RightIcon className={ICON_SIZES[size]} />}
    </button>
  )
})
