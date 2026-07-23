import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Moon, PanelLeft, Settings, Sun } from 'lucide-react'
import { useAdminAuth } from '@/features/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { useUnreadMessageCount } from '@/features/messages/hooks/useAdminMessages'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
  Tooltip,
} from '@/components/ui'

interface TopNavbarProps {
  onToggleSidebar: () => void
}

export function TopNavbar({ onToggleSidebar }: TopNavbarProps) {
  const { admin, logout } = useAdminAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const unreadCount = useUnreadMessageCount()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const iconButtonCls =
    'rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Tooltip content="Basculer le menu">
          <button onClick={onToggleSidebar} className={iconButtonCls} aria-label="Basculer le menu">
            <PanelLeft className="h-5 w-5" />
          </button>
        </Tooltip>
        <h2 className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
          Bonjour, <span className="font-semibold text-gray-900 dark:text-gray-100">{admin?.name ?? 'Admin'}</span>
        </h2>
      </div>

      <div className="flex items-center gap-1.5">
        <Tooltip content={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
          <button onClick={toggleTheme} className={iconButtonCls} aria-label="Basculer le thème">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </Tooltip>

        <Tooltip content="Messages">
          <button
            onClick={() => navigate('/messages')}
            className={`relative ${iconButtonCls}`}
            aria-label="Messages non lus"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </Tooltip>

        <Dropdown>
          <DropdownTrigger asChild>
            <button
              className="ml-1.5 flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Menu utilisateur"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-semibold text-white shadow-sm">
                {admin?.name?.charAt(0).toUpperCase() ?? 'A'}
              </div>
            </button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[230px]">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{admin?.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{admin?.email}</p>
              {admin?.role && (
                <p className="mt-1 inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                  {admin.role}
                </p>
              )}
            </div>
            <DropdownSeparator />
            <DropdownItem icon={Settings} onSelect={() => navigate('/settings')}>
              Paramètres
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={LogOut} danger onSelect={handleLogout}>
              Déconnexion
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  )
}
