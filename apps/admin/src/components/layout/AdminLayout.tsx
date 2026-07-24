import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'
import { CommandPalette } from '@/components/CommandPalette'
import { useAdminAuth } from '@/features/auth'

const IDLE_MS = 30 * 60 * 1000

export function AdminLayout() {
  const location = useLocation()
  const { logout } = useAdminAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('admin-sidebar-collapsed') === 'true'
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => logout(), IDLE_MS)
    }
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [logout])

  function toggleSidebar() {
    if (window.innerWidth < 768) {
      setMobileOpen((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev
        localStorage.setItem('admin-sidebar-collapsed', String(next))
        return next
      })
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </div>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-y-0 left-0 z-50 flex md:hidden">
          <Sidebar
            collapsed={false}
            onToggleCollapse={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
          />
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar onToggleSidebar={toggleSidebar} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
