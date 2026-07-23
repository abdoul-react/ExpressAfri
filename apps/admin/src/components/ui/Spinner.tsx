import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' } as const

export function Spinner({ size = 'md', className }: { size?: keyof typeof SIZES; className?: string }) {
  return <Loader2 className={cn('animate-spin text-gray-400 dark:text-gray-500', SIZES[size], className)} />
}

/** Bloc de chargement centré pleine largeur, avec libellé optionnel. */
export function LoadingBlock({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-500">
      <Spinner size="lg" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
