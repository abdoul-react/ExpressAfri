import { Injectable, UnauthorizedException, NotFoundException, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { eq, sql } from 'drizzle-orm'
import * as bcrypt from 'bcryptjs'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { admins, roles } from '../../database/schema/auth'

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const [admin] = await this.db.select().from(admins).where(eq(admins.email, email)).limit(1)
    if (!admin) throw new UnauthorizedException('Email ou mot de passe incorrect')

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) throw new UnauthorizedException('Email ou mot de passe incorrect')
    if (!admin.isActive) throw new UnauthorizedException('Compte désactivé')

    // Récupérer les permissions du rôle associé (sauf superAdmin qui a tout)
    const permissions = await this.resolvePermissions(admin)

    const payload = { sub: admin.id, email: admin.email, role: admin.role }
    return {
      accessToken: this.jwt.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isSuperAdmin: admin.isSuperAdmin,
        permissions,
        storeId: admin.storeId ?? null,
      },
    }
  }

  async getProfile(adminId: string) {
    const [admin] = await this.db.select().from(admins).where(eq(admins.id, adminId)).limit(1)
    if (!admin) throw new UnauthorizedException()

    const permissions = await this.resolvePermissions(admin)

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isSuperAdmin: admin.isSuperAdmin,
      permissions,
      storeId: admin.storeId ?? null,
    }
  }

  /**
   * Résout les permissions effectives d'un admin :
   * - isSuperAdmin → '*' (accès total)
   * - admin avec rôle enregistré dans la table `roles` → les permissions du rôle
   *   - si le rôle est marqué isSuperAdmin ou contient ["*"] → '*'
   * - admin sans rôle correspondant → []
   */
  private async resolvePermissions(admin: { isSuperAdmin: boolean | null; role: string }): Promise<string[] | '*'> {
    if (admin.isSuperAdmin) return '*'

    // Chercher le rôle par son id (champ `role` de l'admin correspond à `id` dans roles)
    const [role] = await this.db.select().from(roles).where(eq(roles.id, admin.role)).limit(1)
    if (!role) return []

    // Un rôle marqué isSuperAdmin ou dont les permissions contiennent "*" → accès total
    if (role.isSuperAdmin || (Array.isArray(role.permissions) && role.permissions.includes('*'))) return '*'

    return role.permissions ?? []
  }

  // Admin CRUD
  async listAdmins(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const [data, [{ count }]] = await Promise.all([
      this.db.select({ id: admins.id, email: admins.email, name: admins.name, role: admins.role, isSuperAdmin: admins.isSuperAdmin, isActive: admins.isActive, createdAt: admins.createdAt }).from(admins).limit(limit).offset(offset).orderBy(admins.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(admins),
    ])
    return { data, total: Number(count), page }
  }

  async getAdminById(id: string) {
    const [admin] = await this.db.select({ id: admins.id, email: admins.email, name: admins.name, role: admins.role, isSuperAdmin: admins.isSuperAdmin, isActive: admins.isActive, createdAt: admins.createdAt }).from(admins).where(eq(admins.id, id)).limit(1)
    if (!admin) throw new NotFoundException('Admin introuvable')
    return admin
  }

  async createAdmin(data: { email: string; name: string; password: string; role?: string; isSuperAdmin?: boolean }) {
    const passwordHash = await bcrypt.hash(data.password, 10)
    const [admin] = await this.db.insert(admins).values({ email: data.email, name: data.name, passwordHash, role: data.role ?? 'admin', isSuperAdmin: data.isSuperAdmin ?? false }).returning()
    return { id: admin.id, email: admin.email, name: admin.name, role: admin.role, isSuperAdmin: admin.isSuperAdmin, isActive: admin.isActive }
  }

  async updateAdmin(id: string, data: { name?: string; email?: string; isActive?: boolean; role?: string }) {
    const [admin] = await this.db.update(admins).set({ ...data, updatedAt: new Date() }).where(eq(admins.id, id)).returning()
    if (!admin) throw new NotFoundException('Admin introuvable')
    return { id: admin.id, email: admin.email, name: admin.name, role: admin.role, isSuperAdmin: admin.isSuperAdmin, isActive: admin.isActive }
  }

  async deleteAdmin(id: string) { await this.db.delete(admins).where(eq(admins.id, id)) }

  async changeAdminPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères')
    }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    const [admin] = await this.db
      .update(admins)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(admins.id, id))
      .returning()
    if (!admin) throw new NotFoundException('Admin introuvable')
    return { id: admin.id, email: admin.email, name: admin.name, updated: true }
  }

  // Roles CRUD
  async listRoles() { return this.db.select().from(roles).orderBy(roles.createdAt) }

  async getRoleById(id: string) {
    const [role] = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1)
    if (!role) throw new NotFoundException('Rôle introuvable')
    return role
  }

  async createRole(data: { label: string; description?: string; permissions?: string[]; isSuperAdmin?: boolean }) {
    const [role] = await this.db.insert(roles).values(data).returning()
    return role
  }

  async updateRole(id: string, data: { label?: string; description?: string; permissions?: string[]; isSuperAdmin?: boolean }) {
    const [role] = await this.db.update(roles).set(data).where(eq(roles.id, id)).returning()
    if (!role) throw new NotFoundException('Rôle introuvable')
    return role
  }

  async deleteRole(id: string) { await this.db.delete(roles).where(eq(roles.id, id)) }

  async listPermissions() {
    return [
      { key: 'admins.read', label: 'Voir la liste des administrateurs' },
      { key: 'admins.create', label: 'Créer un administrateur' },
      { key: 'admins.update', label: 'Modifier un administrateur' },
      { key: 'admins.delete', label: 'Supprimer un administrateur' },
      { key: 'roles.read', label: 'Voir les rôles' },
      { key: 'roles.create', label: 'Créer un rôle personnalisé' },
      { key: 'roles.update', label: 'Modifier un rôle' },
      { key: 'roles.delete', label: 'Supprimer un rôle' },
      { key: 'roles.assign', label: 'Assigner des permissions à un rôle' },
      { key: 'permissions.read', label: 'Voir les permissions disponibles' },
      { key: 'permissions.assign', label: 'Assigner une permission à un rôle' },
      { key: 'users.read', label: 'Voir les utilisateurs clients' },
      { key: 'users.create', label: 'Créer un compte client' },
      { key: 'users.update', label: 'Modifier un client' },
      { key: 'users.delete', label: 'Supprimer un client' },
      { key: 'users.ban', label: 'Bannir un client' },
      { key: 'products.read', label: 'Voir les produits' },
      { key: 'products.create', label: 'Créer un produit' },
      { key: 'products.update', label: 'Modifier un produit' },
      { key: 'products.delete', label: 'Supprimer un produit' },
      { key: 'products.export', label: 'Exporter les produits' },
      { key: 'categories.read', label: 'Voir les catégories' },
      { key: 'categories.create', label: 'Créer une catégorie' },
      { key: 'categories.update', label: 'Modifier une catégorie' },
      { key: 'categories.delete', label: 'Supprimer une catégorie' },
      { key: 'stores.read', label: 'Voir les boutiques' },
      { key: 'stores.create', label: 'Créer une boutique' },
      { key: 'stores.update', label: 'Modifier une boutique' },
      { key: 'stores.delete', label: 'Supprimer une boutique' },
      { key: 'stores.approve', label: 'Approuver une boutique' },
      { key: 'stores.reject', label: 'Rejeter une boutique' },
      { key: 'orders.read', label: 'Voir les commandes' },
      { key: 'orders.update', label: "Modifier le statut d'une commande" },
      { key: 'orders.cancel', label: 'Annuler une commande' },
      { key: 'orders.refund', label: 'Rembourser une commande' },
      { key: 'orders.export', label: 'Exporter les commandes' },
      { key: 'payments.read', label: 'Voir les transactions' },
      { key: 'payments.update', label: 'Gérer les reçus et leurs paramètres' },
      { key: 'payments.refund', label: 'Effectuer un remboursement' },
      { key: 'content.read', label: 'Voir le contenu CMS' },
      { key: 'content.create', label: 'Créer du contenu' },
      { key: 'content.update', label: 'Modifier le contenu' },
      { key: 'content.delete', label: 'Supprimer du contenu' },
      { key: 'promotions.read', label: 'Voir les promotions' },
      { key: 'promotions.create', label: 'Créer une promotion' },
      { key: 'promotions.update', label: 'Modifier une promotion' },
      { key: 'promotions.delete', label: 'Supprimer une promotion' },
      { key: 'coupons.read', label: 'Voir les coupons' },
      { key: 'coupons.create', label: 'Créer un coupon' },
      { key: 'coupons.update', label: 'Modifier un coupon' },
      { key: 'coupons.delete', label: 'Supprimer un coupon' },
      { key: 'campaigns.read', label: 'Voir les campagnes' },
      { key: 'campaigns.create', label: 'Créer une campagne' },
      { key: 'campaigns.update', label: 'Modifier une campagne' },
      { key: 'campaigns.delete', label: 'Supprimer une campagne' },
      { key: 'affiliates.read', label: 'Voir les affiliés' },
      { key: 'affiliates.create', label: 'Créer un affilié' },
      { key: 'affiliates.update', label: 'Modifier un affilié' },
      { key: 'affiliates.delete', label: 'Supprimer un affilié' },
      { key: 'affiliates.approve', label: 'Approuver/activer un affilié' },
      { key: 'affiliates.suspend', label: 'Suspendre/bannir un affilié' },
      { key: 'commissions.read', label: 'Voir les commissions' },
      { key: 'commissions.approve', label: 'Approuver/rejeter une commission' },
      { key: 'analytics.read', label: 'Voir les statistiques' },
      { key: 'analytics.export', label: 'Exporter les rapports analytiques' },
      { key: 'audit.read', label: "Consulter les journaux d'activité" },
      { key: 'audit.export', label: 'Exporter les journaux' },
      { key: 'messages.read', label: 'Voir les messages' },
      { key: 'messages.update', label: 'Répondre aux messages' },
      { key: 'notifications.read', label: 'Voir les notifications' },
      { key: 'notifications.create', label: 'Envoyer une notification' },
      { key: 'notifications.update', label: 'Modifier une notification' },
      { key: 'settings.read', label: 'Voir les paramètres' },
      { key: 'settings.update', label: 'Modifier les paramètres' },
      { key: 'features.read', label: 'Voir les fonctionnalités' },
      { key: 'features.update', label: 'Activer/désactiver une fonctionnalité' },
      { key: 'shipping.read', label: 'Voir les zones de livraison' },
      { key: 'shipping.create', label: 'Créer une règle de livraison' },
      { key: 'shipping.update', label: 'Modifier une règle de livraison' },
      { key: 'shipping.delete', label: 'Supprimer une règle de livraison' },
      { key: 'reports.read', label: 'Voir les signalements' },
      { key: 'reports.update', label: 'Traiter un signalement' },
      { key: 'reports.export', label: 'Exporter les signalements' },
      { key: 'disputes.read', label: 'Voir les litiges' },
      { key: 'disputes.update', label: "Modifier le statut d'un litige" },
      { key: 'disputes.resolve', label: 'Résoudre un litige (rembourser ou rejeter)' },
      { key: 'disputes.delete', label: 'Supprimer un litige' },
      { key: 'disputes.export', label: 'Exporter les litiges' },
      { key: 'publication.read', label: 'Voir les contenus en attente de publication' },
      { key: 'publication.create', label: 'Créer un contenu à publier' },
      { key: 'publication.update', label: 'Modifier un contenu en cours de publication' },
      { key: 'publication.publish', label: 'Publier un contenu' },
      { key: 'publication.reject', label: 'Rejeter un contenu' },
    ]
  }
}
