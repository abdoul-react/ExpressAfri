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

    // SuperAdmin → accès total
    if (user.isSuperAdmin) return true;

    // Permissions '*' (rôle marqué superAdmin ou contenant ["*"])
    if (user.permissions === '*') return true;

    // Tableau de permissions : toutes les permissions requises doivent être satisfaites
    if (!Array.isArray(user.permissions)) return false;
    return requiredPermissions.every((p) =>
      matchesPermission(user.permissions, p),
    );
  }
}
