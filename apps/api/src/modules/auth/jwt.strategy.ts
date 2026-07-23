import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { admins, roles } from '../../database/schema/auth'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(DRIZZLE) private db: DrizzleDB,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => { const s = config.get<string>('JWT_SECRET'); if (!s) throw new Error('JWT_SECRET env variable is required'); return s; })(),
    })
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const [admin] = await this.db.select().from(admins).where(eq(admins.id, payload.sub)).limit(1)
    if (!admin || !admin.isActive) throw new UnauthorizedException()

    // Résoudre les permissions : superAdmin → '*', sinon chercher le rôle dans la table roles
    let permissions: string[] | '*' = []
    if (admin.isSuperAdmin) {
      permissions = '*'
    } else {
      const [role] = await this.db.select().from(roles).where(eq(roles.id, admin.role)).limit(1)
      if (role) {
        permissions = (role.isSuperAdmin || (Array.isArray(role.permissions) && role.permissions.includes('*')))
          ? '*'
          : (role.permissions ?? [])
      }
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isSuperAdmin: admin.isSuperAdmin,
      permissions,
      // Gérant de boutique : présent → toutes ses requêtes sont cloisonnées à cette boutique
      storeId: admin.storeId ?? null,
    }
  }
}
