export const PERMISSIONS = {
  'admins.read': 'Voir la liste des administrateurs',
  'admins.create': 'Créer un administrateur',
  'admins.update': 'Modifier un administrateur',
  'admins.delete': 'Supprimer un administrateur',

  'roles.read': 'Voir les rôles',
  'roles.create': 'Créer un rôle personnalisé',
  'roles.update': 'Modifier un rôle',
  'roles.delete': 'Supprimer un rôle',
  'roles.assign': 'Assigner des permissions à un rôle',

  'permissions.read': 'Voir les permissions disponibles',
  'permissions.assign': 'Assigner une permission à un rôle',

  'users.read': 'Voir les utilisateurs clients',
  'users.create': 'Créer un compte client',
  'users.update': 'Modifier un client',
  'users.delete': 'Supprimer un client',
  'users.ban': 'Bannir un client',

  'products.read': 'Voir les produits',
  'products.create': 'Créer un produit',
  'products.update': 'Modifier un produit',
  'products.delete': 'Supprimer un produit',
  'products.export': 'Exporter les produits',
  'products.moderate': 'Modérer les produits en attente (approuver/rejeter)',

  'categories.read': 'Voir les catégories',
  'categories.create': 'Créer une catégorie',
  'categories.update': 'Modifier une catégorie',
  'categories.delete': 'Supprimer une catégorie',

  'stores.read': 'Voir les boutiques',
  'stores.create': 'Créer une boutique',
  'stores.update': 'Modifier une boutique',
  'stores.delete': 'Supprimer une boutique',
  'stores.approve': 'Approuver une boutique',
  'stores.reject': 'Rejeter une boutique',

  'orders.read': 'Voir les commandes',
  'orders.update': "Modifier le statut d'une commande",
  'orders.cancel': 'Annuler une commande',
  'orders.refund': 'Rembourser une commande',
  'orders.export': 'Exporter les commandes',

  'payments.read': 'Voir les transactions',
  'payments.update': 'Gérer les reçus et leurs paramètres',
  'payments.refund': 'Effectuer un remboursement',

  'content.read': 'Voir le contenu CMS',
  'content.create': 'Créer du contenu',
  'content.update': 'Modifier le contenu',
  'content.delete': 'Supprimer du contenu',
  'content.moderate': 'Modérer les avis clients et signalements de contenu',

  'promotions.read': 'Voir les promotions',
  'promotions.create': 'Créer une promotion',
  'promotions.update': 'Modifier une promotion',
  'promotions.delete': 'Supprimer une promotion',

  'coupons.read': 'Voir les coupons',
  'coupons.create': 'Créer un coupon',
  'coupons.update': 'Modifier un coupon',
  'coupons.delete': 'Supprimer un coupon',

  'campaigns.read': 'Voir les campagnes',
  'campaigns.create': 'Créer une campagne',
  'campaigns.update': 'Modifier une campagne',
  'campaigns.delete': 'Supprimer une campagne',

  'affiliates.read': 'Voir les affiliés',
  'affiliates.create': 'Créer un affilié',
  'affiliates.update': 'Modifier un affilié',
  'affiliates.delete': 'Supprimer un affilié',
  'affiliates.approve': 'Approuver/activer un affilié',
  'affiliates.suspend': 'Suspendre/bannir un affilié',
  'commissions.read': 'Voir les commissions',
  'commissions.approve': 'Approuver/rejeter une commission',

  'analytics.read': 'Voir les statistiques',
  'analytics.export': 'Exporter les rapports analytiques',

  'audit.read': "Consulter les journaux d'activité",
  'audit.export': 'Exporter les journaux',

  'messages.read': 'Voir les messages',
  'messages.update': 'Répondre aux messages',

  'notifications.read': 'Voir les notifications',
  'notifications.create': 'Envoyer une notification',
  'notifications.update': 'Modifier une notification',
  'notifications.manage': 'Envoyer des SMS et notifications push en masse',

  'settings.read': 'Voir les paramètres',
  'settings.update': 'Modifier les paramètres',

  'features.read': 'Voir les fonctionnalités',
  'features.update': 'Activer/désactiver une fonctionnalité',

  'shipping.read': 'Voir les zones de livraison',
  'shipping.create': 'Créer une règle de livraison',
  'shipping.update': 'Modifier une règle de livraison',
  'shipping.delete': 'Supprimer une règle de livraison',

  'delivery.manage': 'Gérer les livreurs et les assignations de livraison',

  'reports.read': 'Voir les signalements',
  'reports.update': 'Traiter un signalement',
  'reports.export': 'Exporter les signalements',

  'disputes.read': 'Voir les litiges',
  'disputes.update': 'Modifier le statut d\'un litige',
  'disputes.resolve': 'Résoudre un litige (rembourser ou rejeter)',
  'disputes.delete': 'Supprimer un litige',
  'disputes.export': 'Exporter les litiges',

  'publication.read': 'Voir les contenus en attente de publication',
  'publication.create': 'Créer un contenu à publier',
  'publication.update': 'Modifier un contenu en cours de publication',
  'publication.publish': 'Publier un contenu',
  'publication.reject': 'Rejeter un contenu',
} as const

export type Permission = keyof typeof PERMISSIONS
