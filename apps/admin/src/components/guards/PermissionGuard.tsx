import { useAdminAuth } from '@/features/auth'
import type { Permission } from '@/types/Permission'
import type { ReactNode } from 'react'

interface PermissionGuardProps {
  permission: Permission
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({ permission, fallback, children }: PermissionGuardProps) {
  const { hasPermission } = useAdminAuth()

  if (!hasPermission(permission)) {
    return fallback ?? null
  }

  return <>{children}</>
}
