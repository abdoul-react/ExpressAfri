import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Vérifie qu'une permission est satisfaite par la liste de l'utilisateur.
 * Supporte les wildcards : "coupons.*" satisfait "coupons.read", "coupons.create", etc.
 */
function matchesPermission(
  userPermissions: string[],
  required: string,
): boolean {
  return userPermissions.some((p) => {
    if (p === required) return true;
    // Wildcard : "resource.*" → satisfait "resource.anything"
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2); // "coupons"
      return required.startsWith(prefix + '.');
    }
    return false;
  });
}

/**
 * Même logique que le guard, mais appelable depuis un contrôleur lorsque
 * l'autorisation dépend aussi de la donnée visée (ex. « gérant de CETTE
 * boutique » OU « admin plateforme disposant de la permission »).
 */
export function userHasPermission(user: any, required: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (user.permissions === '*') return true;
  if (!Array.isArray(user.permissions)) return false;
  return matchesPermission(user.permissions, required);
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Pas de permissions requises sur cette route → accès libre (JWT doit quand même être valide)
    if (!requiredPermissions?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    return requiredPermissions.every((p) => userHasPermission(user, p));
  }
}
