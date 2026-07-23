import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '@/features/auth'
import type { Permission } from '@/types/Permission'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: Permission[]
}

export function ProtectedRoute({ children, requiredPermissions }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const authorized = requiredPermissions.length === 1
      ? hasPermission(requiredPermissions[0])
      : hasAnyPermission(requiredPermissions)

    if (!authorized) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}
