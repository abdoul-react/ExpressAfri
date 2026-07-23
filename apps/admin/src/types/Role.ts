import type { Permission } from './Permission'

export type RoleId = 'super_admin' | 'product_admin' | 'order_admin' | 'content_admin' | 'support_admin' | 'marketing_admin' | 'logistics_admin' | 'publication_admin'

export interface Role {
  id: RoleId
  label: string
  description: string
  permissions: Permission[] | '*'
  isSuperAdmin?: boolean
}

export const ROLES: Record<RoleId, Role> = {
  super_admin: {
    id: 'super_admin',
    label: 'Super Administrateur',
    description: 'Accès total et illimité à toutes les fonctionnalités de la plateforme',
    permissions: '*',
    isSuperAdmin: true,
  },
  product_admin: {
    id: 'product_admin',
    label: 'Administrateur Produits',
    description: 'Gère le catalogue, les catégories et les boutiques',
    permissions: [
      'products.read', 'products.create', 'products.update',
      'products.delete', 'products.export',
      'categories.read', 'categories.create', 'categories.update',
      'categories.delete',
      'stores.read', 'stores.update', 'stores.approve',
    ],
  },
  order_admin: {
    id: 'order_admin',
    label: 'Administrateur Commandes',
    description: 'Gère les commandes, les paiements et les remboursements',
    permissions: [
      'orders.read', 'orders.update', 'orders.cancel',
      'orders.refund', 'orders.export',
      'payments.read', 'payments.update', 'payments.refund',
      'users.read',
    ],
  },
  content_admin: {
    id: 'content_admin',
    label: 'Administrateur Contenu',
    description: 'Gère le CMS, les bannières, les promotions et les coupons',
    permissions: [
      'content.read', 'content.create', 'content.update', 'content.delete',
      'promotions.read', 'promotions.create', 'promotions.update',
      'promotions.delete',
      'coupons.read', 'coupons.create', 'coupons.update', 'coupons.delete',
    ],
  },
  support_admin: {
    id: 'support_admin',
    label: 'Administrateur Support',
    description: 'Gère les clients, les messages et les signalements',
    permissions: [
      'users.read', 'users.update',
      'orders.read',
      'messages.read', 'messages.update',
      'reports.read', 'reports.update',
    ],
  },
  marketing_admin: {
    id: 'marketing_admin',
    label: 'Administrateur Marketing',
    description: 'Gère les campagnes, les promotions, les analyses et les affiliés',
    permissions: [
      'campaigns.read', 'campaigns.create', 'campaigns.update',
      'campaigns.delete',
      'promotions.read', 'promotions.create', 'promotions.update',
      'coupons.read', 'coupons.create', 'coupons.update',
      'affiliates.read', 'affiliates.create', 'affiliates.update',
      'commissions.read', 'commissions.approve',
      'analytics.read', 'analytics.export',
    ],
  },
  logistics_admin: {
    id: 'logistics_admin',
    label: 'Administrateur Logistique',
    description: 'Gère les livreurs, les zones de livraison et les assignations',
    permissions: [
      'shipping.read', 'shipping.create', 'shipping.update', 'shipping.delete',
      'orders.read',
    ],
  },
  publication_admin: {
    id: 'publication_admin',
    label: 'Administrateur Publication',
    description: 'Modère et publie les contenus soumis (produits, articles, pages)',
    permissions: [
      'publication.read', 'publication.create', 'publication.update',
      'publication.publish', 'publication.reject',
      'content.read', 'content.update',
      'products.read', 'products.update',
    ],
  },
}
