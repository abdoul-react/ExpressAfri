import { Search, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { INPUT_BASE_CLS } from './Input'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', className, size = 'md' }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_BASE_CLS, size === 'sm' ? 'py-2' : 'py-2.5', 'w-full pl-9 pr-9')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Effacer la recherche"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
