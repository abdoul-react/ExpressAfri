import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Box, ChevronRight, Globe, Home, LayoutDashboard, List, LogOut,
  MessageSquare, Package, Percent, Search, Settings, ShoppingBag, ShoppingCart,
  Star, Store, Tag, Truck, Users,
} from 'lucide-react'
import { useAdminAuth } from '@/features/auth'
import { cn } from '@/lib/cn'

interface CommandItem {
  id: string
  label: string
  keywords?: string
  path?: string
  icon: React.ElementType
  action?: () => void
}

const NAV_ITEMS: CommandItem[] = [
  { id: 'dashboard',    label: 'Tableau de bord',    path: '/',              icon: LayoutDashboard },
  { id: 'products',     label: 'Produits',            path: '/products',      icon: Package },
  { id: 'categories',  label: 'Catégories',           path: '/categories',    icon: Tag },
  { id: 'stores',      label: 'Boutiques',            path: '/stores',        icon: Store },
  { id: 'orders',      label: 'Commandes',            path: '/orders',        icon: ShoppingCart },
  { id: 'payments',    label: 'Paiements',            path: '/payments',      icon: ShoppingBag },
  { id: 'customers',   label: 'Clients',              path: '/customers',     icon: Users },
  { id: 'delivery',    label: 'Livraisons',           path: '/delivery',      icon: Truck },
  { id: 'payouts',     label: 'Versements',           path: '/payouts',       icon: Box },
  { id: 'returns',     label: 'Retours',              path: '/returns',       icon: List },
  { id: 'coupons',     label: 'Coupons',              path: '/coupons',       icon: Percent },
  { id: 'campaigns',   label: 'Campagnes',            path: '/campaigns',     icon: Globe },
  { id: 'loyalty',     label: 'Fidélité',             path: '/loyalty',       icon: Star },
  { id: 'analytics',   label: 'Analytiques',          path: '/analytics',     icon: BarChart3 },
  { id: 'messages',    label: 'Messages',             path: '/messages',      icon: MessageSquare },
  { id: 'content',     label: 'Contenu',              path: '/content',       icon: Home },
  { id: 'settings',    label: 'Paramètres',           path: '/settings',      icon: Settings },
  { id: 'admins',      label: 'Administrateurs',      path: '/admins',        icon: Users,   keywords: 'admin' },
  { id: 'roles',       label: 'Rôles & permissions',  path: '/roles',         icon: Settings },
  { id: 'audit',       label: 'Journal d\'audit',     path: '/audit',         icon: List },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const allItems: CommandItem[] = [
    ...NAV_ITEMS,
    { id: 'logout', label: 'Déconnexion', icon: LogOut, action: async () => { await logout(); navigate('/login') } },
  ]

  const filtered = query.trim()
    ? allItems.filter((item) => {
        const haystack = `${item.label} ${item.keywords ?? ''}`.toLowerCase()
        return query.toLowerCase().split(' ').every((word) => haystack.includes(word))
      })
    : allItems

  const select = useCallback((item: CommandItem) => {
    onClose()
    setQuery('')
    if (item.action) item.action()
    else if (item.path) navigate(item.path)
  }, [navigate, onClose])

  useEffect(() => { if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 10) } }, [open])
  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
      else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) select(filtered[active]) }
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, active, filtered, select, onClose])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une page ou action…"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100"
          />
          <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400 dark:border-gray-700 sm:inline">Esc</kbd>
        </div>

        {/* Results */}
        <ul ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-400">Aucun résultat</li>
          ) : filtered.map((item, idx) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                    idx === active
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60',
                  )}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => select(item)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                </button>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
          <p className="text-[10px] text-gray-400">
            <kbd className="rounded border border-gray-200 px-1 dark:border-gray-700">↑↓</kbd> naviguer ·{' '}
            <kbd className="rounded border border-gray-200 px-1 dark:border-gray-700">↵</kbd> ouvrir ·{' '}
            <kbd className="rounded border border-gray-200 px-1 dark:border-gray-700">Esc</kbd> fermer
          </p>
        </div>
      </div>
    </div>
  )
}
