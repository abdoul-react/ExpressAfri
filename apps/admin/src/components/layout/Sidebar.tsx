import { NavLink } from 'react-router-dom'
import {
  Award,
  BarChart3,
  Bike,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileText,
  Flag,
  Gift,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  Megaphone,
  MessageSquareText,
  Package,
  ReceiptText,
  Scale,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Truck,
  Undo2,
  Upload,
  UserCog,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useAdminAuth } from '@/features/auth'
import { useUnreadMessageCount } from '@/features/messages/hooks/useAdminMessages'
import type { Permission } from '@/types/Permission'
import { cn } from '@/lib/cn'
import { Tooltip } from '@/components/ui'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permission?: Permission
  permissions?: Permission[]
  badge?: number
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Général',
    items: [{ label: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'analytics.read' }],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Produits', path: '/products', icon: Package, permission: 'products.read' },
      { label: 'Modération', path: '/products/moderation', icon: ShieldCheck, permission: 'products.moderate' as const },
      { label: 'Import CSV', path: '/products/import', icon: Upload, permission: 'products.create' as const },
      { label: 'Catégories', path: '/categories', icon: Tags, permission: 'categories.read' },
      { label: 'Boutiques', path: '/stores', icon: Store, permission: 'stores.read' },
      { label: 'Commandes', path: '/orders', icon: ShoppingCart, permission: 'orders.read' },
      { label: 'Retours', path: '/returns', icon: Undo2, permission: 'orders.read' as const },
      { label: 'Paiements', path: '/payments', icon: CreditCard, permission: 'payments.read' },
      { label: 'Reçus', path: '/receipts', icon: ReceiptText, permission: 'payments.read' },
      { label: 'Clients', path: '/customers', icon: Users, permission: 'users.read' },
      { label: 'Avis clients', path: '/reviews', icon: Star, permission: 'content.moderate' as const },
      { label: 'Versements', path: '/payouts', icon: Wallet, permission: 'commissions.read' as const },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { label: 'CMS', path: '/content', icon: FileText, permission: 'content.read' },
      { label: 'Coupons', path: '/coupons', icon: Gift, permission: 'coupons.read' },
      { label: 'Campagnes', path: '/campaigns', icon: Megaphone, permission: 'campaigns.read' },
      { label: 'Fidélité', path: '/loyalty', icon: Award, permission: 'promotions.read' as const },
      { label: 'Affiliation', path: '/affiliates', icon: Share2, permission: 'affiliates.read' as const },
    ],
  },
  {
    label: 'Analytics',
    items: [{ label: 'Statistiques', path: '/analytics', icon: BarChart3, permission: 'analytics.read' }],
  },
  {
    label: 'Support',
    items: [
      { label: 'Messages', path: '/messages', icon: MessagesSquare, permission: 'messages.read' },
      { label: 'Notifications', path: '/notifications', icon: MessageSquareText, permission: 'notifications.manage' as const },
      { label: 'Signalements', path: '/reports', icon: Flag, permission: 'reports.read' },
      { label: 'Litiges', path: '/disputes', icon: Scale, permission: 'disputes.read' as const },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Administrateurs', path: '/admins', icon: UserCog, permission: 'admins.read' },
      { label: 'Rôles', path: '/roles', icon: KeyRound, permission: 'roles.read' },
      { label: 'Audit Log', path: '/audit', icon: ScrollText, permission: 'audit.read' },
      { label: 'Paramètres', path: '/settings', icon: Settings, permission: 'settings.read' },
      { label: 'Fonctionnalités', path: '/features', icon: Zap, permission: 'features.read' },
      { label: 'Livraison', path: '/shipping', icon: Truck, permission: 'shipping.read' },
      { label: 'Livreurs', path: '/delivery', icon: Bike, permission: 'shipping.read' },
    ],
  },
]

function ItemBadge({ count, floating }: { count: number; floating?: boolean }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-red-500 font-bold leading-none text-white',
        floating
          ? 'absolute -right-1.5 -top-1.5 h-4 min-w-4 px-0.5 text-[10px]'
          : 'h-5 min-w-5 px-1.5 text-[11px]',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function SidebarItem({ item, collapsed, onClose }: { item: NavItem; collapsed: boolean; onClose?: () => void }) {
  const link = (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={() => onClose?.()}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2' : 'px-3',
          isActive
            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500" />
          )}
          <span className="relative flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center">
            <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
            {collapsed && item.badge != null && item.badge > 0 && <ItemBadge count={item.badge} floating />}
          </span>
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.badge != null && item.badge > 0 && <ItemBadge count={item.badge} />}
        </>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right">
        {link}
      </Tooltip>
    )
  }
  return link
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onClose?: () => void
}

export function Sidebar({ collapsed, onToggleCollapse, onClose }: SidebarProps) {
  const { hasPermission, hasAnyPermission } = useAdminAuth()
  const unreadMessages = useUnreadMessageCount()

  // Injection dynamique du badge sur l'item Messages
  const sectionsWithBadges: NavSection[] = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.path === '/messages' ? { ...item, badge: unreadMessages } : item,
    ),
  }))

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-900',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-800">
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white shadow-sm">
              E
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">ExpressAfri</p>
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Administration</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden md:inline-flex rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sectionsWithBadges.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.permission) return hasPermission(item.permission)
            if (item.permissions) return hasAnyPermission(item.permissions)
            return true
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <SidebarItem key={item.path} item={item} collapsed={collapsed} onClose={onClose} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
