import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface Crumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
  backHref?: string
  className?: string
}

export function PageHeader({ title, description, breadcrumbs, actions, backHref, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500" aria-label="Fil d'Ariane">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {backHref && (
            <Link
              to={backHref}
              className="mt-0.5 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
