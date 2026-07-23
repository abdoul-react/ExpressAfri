import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'

export function AdminLayout() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('admin-sidebar-collapsed') === 'true'
  })

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('admin-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8">
            {/* key = pathname : l'erreur se réinitialise quand on change de page */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
