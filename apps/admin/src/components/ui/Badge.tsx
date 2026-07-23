import { cn } from '../../lib/cn'
import { statusMeta, type StatusMap, type StatusVariant } from '../../lib/status'

export interface BadgeProps {
  variant?: StatusVariant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
  children: React.ReactNode
}

const VARIANTS: Record<StatusVariant, string> = {
  neutral: 'bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-400/20',
  primary:
    'bg-primary-50 text-primary-700 ring-primary-600/20 dark:bg-primary-500/10 dark:text-primary-400 dark:ring-primary-400/20',
  success:
    'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-400/20',
  warning:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20',
  purple:
    'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20',
}

const DOTS: Record<StatusVariant, string> = {
  neutral: 'bg-gray-400',
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
}

export function Badge({ variant = 'neutral', size = 'md', dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        VARIANTS[variant],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[variant])} />}
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  map: StatusMap
  value: string | undefined | null
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

/** Badge de statut branché sur le registre central `src/lib/status.ts`. */
export function StatusBadge({ map, value, size, dot, className }: StatusBadgeProps) {
  const meta = statusMeta(map, value)
  return (
    <Badge variant={meta.variant} size={size} dot={dot} className={className}>
      {meta.label}
    </Badge>
  )
}
