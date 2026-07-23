import type { Permission } from '@/types/Permission'

/**
 * Vérifie qu'une permission requise est satisfaite par la liste de l'utilisateur.
 * Supporte les wildcards : "coupons.*" satisfait "coupons.read", "coupons.create", etc.
 */
function matchesPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.some((p) => {
    if (p === required) return true
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2)
      return required.startsWith(prefix + '.')
    }
    return false
  })
}

export function hasPermission(
  userPermissions: string[] | '*',
  requiredPermission: Permission,
): boolean {
  if (userPermissions === '*') return true
  return matchesPermission(userPermissions, requiredPermission)
}

export function hasAnyPermission(
  userPermissions: string[] | '*',
  requiredPermissions: Permission[],
): boolean {
  if (userPermissions === '*') return true
  return requiredPermissions.some((p) => matchesPermission(userPermissions, p))
}

export function hasAllPermissions(
  userPermissions: string[] | '*',
  requiredPermissions: Permission[],
): boolean {
  if (userPermissions === '*') return true
  return requiredPermissions.every((p) => matchesPermission(userPermissions, p))
}
