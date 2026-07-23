import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Card } from './Card'
import { Skeleton } from './Skeleton'

type Tone = 'primary' | 'success' | 'info' | 'warning' | 'neutral' | 'purple'

const TONES: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  success: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400',
  info: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

export interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: string
  icon: LucideIcon
  tone?: Tone
  trend?: { value: number; label?: string }
  loading?: boolean
  className?: string
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'neutral', trend, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <Card padding="sm" className={cn('flex items-center gap-4 p-5', className)}>
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      </Card>
    )
  }

  const positive = (trend?.value ?? 0) >= 0

  return (
    <Card padding="sm" className={cn('p-5 transition-shadow hover:shadow-card-hover', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">{value}</p>
          {(trend || sub) && (
            <div className="mt-1.5 flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                    positive
                      ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
                  )}
                >
                  {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {positive ? '+' : ''}
                  {trend.value.toLocaleString('fr-FR')}%
                </span>
              )}
              {(trend?.label || sub) && (
                <span className="truncate text-xs text-gray-400 dark:text-gray-500">{trend?.label ?? sub}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
