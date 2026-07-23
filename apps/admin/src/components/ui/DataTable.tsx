import { useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { Pagination } from './Pagination'
import { Skeleton } from './Skeleton'

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell?: (row: T) => React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  hideBelow?: 'sm' | 'md' | 'lg'
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  loading?: boolean
  skeletonRows?: number
  empty?: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode }
  onRowClick?: (row: T) => void
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }
  footer?: React.ReactNode
  bare?: boolean
  className?: string
  /** Active la virtualisation pour de grands jeux de données. */
  virtualize?: boolean
  /** Hauteur max de la zone scrollable (défaut: 600px). */
  maxHeight?: string
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const
const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const
const ROW_HEIGHT = 52

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  skeletonRows = 6,
  empty,
  onRowClick,
  pagination,
  footer,
  bare = false,
  className,
  virtualize = false,
  maxHeight = '600px',
}: DataTableProps<T>) {
  const colCls = (col: Column<T>) =>
    cn(ALIGN[col.align ?? 'left'], col.hideBelow && HIDE[col.hideBelow], col.className)

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: useCallback(() => scrollRef.current, []),
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: 5,
  })

  const shouldVirtualize = virtualize && !loading && data.length > 50

  const renderRow = (row: T, idx: number) => {
    const key = rowKey(row)
    return (
      <tr
        key={key}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        className={cn(
          'transition-colors',
          onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
        )}
      >
        {columns.map((col) => (
          <td key={col.key} className={cn('px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300', colCls(col))}>
            {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
          </td>
        ))}
      </tr>
    )
  }

  const tableBody = () => {
    if (loading) {
      return Array.from({ length: skeletonRows }).map((_, i) => (
        <tr key={i}>
          {columns.map((col) => (
            <td key={col.key} className={cn('px-4 py-3.5', colCls(col))}>
              <Skeleton className="h-4 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))
    }

    if (shouldVirtualize) {
      return virtualizer.getVirtualItems().map((virtualItem) => (
        <tr
          key={rowKey(data[virtualItem.index])}
          style={{
            height: `${virtualItem.size}px`,
            transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
          }}
          onClick={onRowClick ? () => onRowClick(data[virtualItem.index]) : undefined}
          className={cn(
            'absolute left-0 w-full transition-colors',
            onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
          )}
        >
          {columns.map((col) => (
            <td key={col.key} className={cn('px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300', colCls(col))}>
              {col.cell ? col.cell(data[virtualItem.index]) : String((data[virtualItem.index] as Record<string, unknown>)[col.key] ?? '')}
            </td>
          ))}
        </tr>
      ))
    }

    return data.map((row) => renderRow(row, 0))
  }

  const body = (
    <>
      <div
        ref={shouldVirtualize ? scrollRef : undefined}
        className={cn('overflow-x-auto', shouldVirtualize && 'overflow-y-auto')}
        style={shouldVirtualize ? { maxHeight } : undefined}
      >
        <table className="w-full" style={shouldVirtualize ? { borderCollapse: 'separate', borderSpacing: 0 } : undefined}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400',
                    colCls(col),
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={cn('divide-y divide-gray-100 dark:divide-gray-800', shouldVirtualize && 'relative')}
            style={shouldVirtualize ? { height: `${virtualizer.getTotalSize()}px` } : undefined}
          >
            {tableBody()}
          </tbody>
        </table>
      </div>
      {!loading && data.length === 0 && (
        <EmptyState
          icon={empty?.icon}
          title={empty?.title ?? 'Aucun résultat'}
          description={empty?.description}
          action={empty?.action}
        />
      )}
      {pagination && !loading && data.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <Pagination {...pagination} />
        </div>
      )}
      {footer && <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">{footer}</div>}
    </>
  )

  if (bare) return <div className={className}>{body}</div>

  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      {body}
    </Card>
  )
}
