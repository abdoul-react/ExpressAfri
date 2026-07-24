/**
 * Script : insère les blocs de texte éditables (type "text") dans content_blocks.
 * Ces blocs sont visibles et modifiables dans l'onglet "Textes" de l'admin CMS.
 * Les blocs déjà existants sont ignorés (ON CONFLICT DO NOTHING).
 *
 * Usage : npx tsx src/scripts/seed-text-blocks.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';

type Block = {
  key: string;
  label: string;
  value: string;
  groupName: string;
  screen: string;
};

const TEXT_BLOCKS: Block[] = [
  // ── Branding ──────────────────────────────────────────────
  {
    key: 'app.name',
    label: "Nom de l'application",
    value: 'ExpressAfri',
    groupName: 'branding',
    screen: 'global',
  },
  {
    key: 'app.tagline',
    label: 'Slogan principal',
    value: 'Votre marketplace africaine',
    groupName: 'branding',
    screen: 'global',
  },
  {
    key: 'app.description',
    label: "Description de l'application",
    value: 'Achetez et vendez en toute confiance en Afrique.',
    groupName: 'branding',
    screen: 'global',
  },
  {
    key: 'app.support_email',
    label: 'Email du support',
    value: 'support@expressafri.com',
    groupName: 'branding',
    screen: 'global',
  },
  {
    key: 'app.support_phone',
    label: 'Numéro du support',
    value: '+227 90 00 00 00',
    groupName: 'branding',
    screen: 'global',
  },

  // ── Onboarding ────────────────────────────────────────────
  {
    key: 'onboarding.slide1.title',
    label: 'Slide 1 — Titre',
    value: 'Bienvenue sur ExpressAfri',
    groupName: 'onboarding',
    screen: 'onboarding',
  },
  {
    key: 'onboarding.slide1.subtitle',
    label: 'Slide 1 — Sous-titre',
    value: "La marketplace qui connecte l'Afrique",
    groupName: 'onboarding',
    screen: 'onboarding',
  },
  {
    key: 'onboarding.slide2.title',
    label: 'Slide 2 — Titre',
    value: 'Des milliers de produits',
    groupName: 'onboarding',
    screen: 'onboarding',
  },
  {
    key: 'onboarding.slide2.subtitle',
    label: 'Slide 2 — Sous-titre',
    value: 'Mode, électronique, beauté et bien plus encore',
    groupName: 'onboarding',
    screen: 'onboarding',
  },
  {
    key: 'onboarding.slide3.title',
    label: 'Slide 3 — Titre',
    value: 'Livraison rapide',
    groupName: 'onboarding',
    screen: 'onboarding',
  },
  {
    key: 'onboarding.slide3.subtitle',
    label: 'Slide 3 — Sous-titre',
    value: 'Recevez vos commandes où que vous soyez',
    groupName: 'onboarding',
    screen: 'onboarding',
  },
  {
    key: 'onboarding.cta',
    label: 'Bouton — Commencer',
    value: 'Commencer',
    groupName: 'onboarding',
    screen: 'onboarding',
  },
  {
    key: 'onboarding.skip',
    label: 'Bouton — Passer',
    value: 'Passer',
    groupName: 'onboarding',
    screen: 'onboarding',
  },

  // ── Authentification ──────────────────────────────────────
  {
    key: 'auth.login.title',
    label: 'Connexion — Titre',
    value: 'Connexion',
    groupName: 'auth',
    screen: 'login',
  },
  {
    key: 'auth.login.subtitle',
    label: 'Connexion — Sous-titre',
    value: 'Heureux de vous revoir !',
    groupName: 'auth',
    screen: 'login',
  },
  {
    key: 'auth.login.cta',
    label: 'Connexion — Bouton',
    value: 'Se connecter',
    groupName: 'auth',
    screen: 'login',
  },
  {
    key: 'auth.login.forgot',
    label: 'Connexion — Mot de passe oublié',
    value: 'Mot de passe oublié ?',
    groupName: 'auth',
    screen: 'login',
  },
  {
    key: 'auth.login.no_account',
    label: 'Connexion — Pas de compte',
    value: "Pas encore de compte ? S'inscrire",
    groupName: 'auth',
    screen: 'login',
  },
  {
    key: 'auth.register.title',
    label: 'Inscription — Titre',
    value: 'Créer un compte',
    groupName: 'auth',
    screen: 'register',
  },
  {
    key: 'auth.register.subtitle',
    label: 'Inscription — Sous-titre',
    value: 'Rejoignez la communauté ExpressAfri',
    groupName: 'auth',
    screen: 'register',
  },
  {
    key: 'auth.register.cta',
    label: 'Inscription — Bouton',
    value: "S'inscrire",
    groupName: 'auth',
    screen: 'register',
  },
  {
    key: 'auth.register.has_account',
    label: 'Inscription — Déjà un compte',
    value: 'Déjà un compte ? Se connecter',
    groupName: 'auth',
    screen: 'register',
  },

  // ── Accueil ───────────────────────────────────────────────
  {
    key: 'home.greeting',
    label: 'Accueil — Message de bienvenue',
    value: 'Bonjour',
    groupName: 'home',
    screen: 'home',
  },
  {
    key: 'home.search_placeholder',
    label: 'Accueil — Placeholder recherche',
    value: 'Que recherchez-vous ?',
    groupName: 'home',
    screen: 'home',
  },
  {
    key: 'home.section.featured',
    label: 'Section — En vedette',
    value: 'En vedette',
    groupName: 'home',
    screen: 'home',
  },
  {
    key: 'home.section.new_arrivals',
    label: 'Section — Nouveautés',
    value: 'Nouvelles arrivées',
    groupName: 'home',
    screen: 'home',
  },
  {
    key: 'home.section.flash_sale',
    label: 'Section — Vente flash',
    value: 'Vente flash ⚡',
    groupName: 'home',
    screen: 'home',
  },
  {
    key: 'home.section.best_sellers',
    label: 'Section — Meilleures ventes',
    value: 'Meilleures ventes',
    groupName: 'home',
    screen: 'home',
  },
  {
    key: 'home.section.for_you',
    label: 'Section — Pour vous',
    value: 'Sélectionnés pour vous',
    groupName: 'home',
    screen: 'home',
  },

  // ── Produit ───────────────────────────────────────────────
  {
    key: 'product.add_to_cart',
    label: 'Produit — Ajouter au panier',
    value: 'Ajouter au panier',
    groupName: 'product',
    screen: 'product-detail',
  },
  {
    key: 'product.buy_now',
    label: 'Produit — Acheter maintenant',
    value: 'Acheter maintenant',
    groupName: 'product',
    screen: 'product-detail',
  },
  {
    key: 'product.in_stock',
    label: 'Produit — En stock',
    value: 'En stock',
    groupName: 'product',
    screen: 'product-detail',
  },
  {
    key: 'product.out_of_stock',
    label: 'Produit — Rupture de stock',
    value: 'Rupture de stock',
    groupName: 'product',
    screen: 'product-detail',
  },
  {
    key: 'product.free_delivery',
    label: 'Produit — Livraison gratuite',
    value: 'Livraison gratuite',
    groupName: 'product',
    screen: 'product-detail',
  },
  {
    key: 'product.buyer_protection',
    label: 'Produit — Protection acheteur',
    value: 'Protection acheteur garantie',
    groupName: 'product',
    screen: 'product-detail',
  },
  {
    key: 'product.reviews_title',
    label: 'Produit — Titre avis',
    value: 'Avis clients',
    groupName: 'product',
    screen: 'product-detail',
  },
  {
    key: 'product.no_reviews',
    label: 'Produit — Aucun avis',
    value: "Aucun avis pour l'instant",
    groupName: 'product',
    screen: 'product-detail',
  },

  // ── Panier ────────────────────────────────────────────────
  {
    key: 'cart.title',
    label: 'Panier — Titre',
    value: 'Mon panier',
    groupName: 'cart',
    screen: 'cart',
  },
  {
    key: 'cart.empty',
    label: 'Panier — Vide',
    value: 'Votre panier est vide',
    groupName: 'cart',
    screen: 'cart',
  },
  {
    key: 'cart.empty_hint',
    label: 'Panier — Vide (indication)',
    value: 'Parcourez notre catalogue et ajoutez des articles',
    groupName: 'cart',
    screen: 'cart',
  },
  {
    key: 'cart.checkout_btn',
    label: 'Panier — Bouton commander',
    value: 'Commander',
    groupName: 'cart',
    screen: 'cart',
  },
  {
    key: 'cart.subtotal',
    label: 'Panier — Sous-total',
    value: 'Sous-total',
    groupName: 'cart',
    screen: 'cart',
  },
  {
    key: 'cart.delivery',
    label: 'Panier — Livraison',
    value: 'Livraison',
    groupName: 'cart',
    screen: 'cart',
  },
  {
    key: 'cart.total',
    label: 'Panier — Total',
    value: 'Total',
    groupName: 'cart',
    screen: 'cart',
  },

  // ── Checkout ──────────────────────────────────────────────
  {
    key: 'checkout.payment_title',
    label: 'Paiement — Titre',
    value: 'Mode de paiement',
    groupName: 'checkout',
    screen: 'checkout',
  },
  {
    key: 'checkout.address_title',
    label: 'Paiement — Adresse livraison',
    value: 'Adresse de livraison',
    groupName: 'checkout',
    screen: 'checkout',
  },
  {
    key: 'checkout.confirm_btn',
    label: 'Paiement — Bouton valider',
    value: 'Valider la commande',
    groupName: 'checkout',
    screen: 'checkout',
  },
  {
    key: 'checkout.success_title',
    label: 'Commande confirmée — Titre',
    value: 'Commande confirmée ! 🎉',
    groupName: 'checkout',
    screen: 'checkout',
  },
  {
    key: 'checkout.success_subtitle',
    label: 'Commande confirmée — Sous-titre',
    value: 'Nous préparons votre colis',
    groupName: 'checkout',
    screen: 'checkout',
  },
  {
    key: 'checkout.secure_payment',
    label: 'Paiement — Sécurisé',
    value: 'Paiement 100% sécurisé',
    groupName: 'checkout',
    screen: 'checkout',
  },

  // ── Commandes ─────────────────────────────────────────────
  {
    key: 'orders.title',
    label: 'Commandes — Titre',
    value: 'Mes commandes',
    groupName: 'orders',
    screen: 'orders',
  },
  {
    key: 'orders.empty',
    label: 'Commandes — Aucune',
    value: "Aucune commande pour l'instant",
    groupName: 'orders',
    screen: 'orders',
  },
  {
    key: 'orders.track_btn',
    label: 'Commandes — Suivre',
    value: 'Suivre ma commande',
    groupName: 'orders',
    screen: 'orders',
  },
  {
    key: 'orders.status.pending',
    label: 'Statut — En attente',
    value: 'En attente',
    groupName: 'orders',
    screen: 'orders',
  },
  {
    key: 'orders.status.processing',
    label: 'Statut — En préparation',
    value: 'En préparation',
    groupName: 'orders',
    screen: 'orders',
  },
  {
    key: 'orders.status.shipped',
    label: 'Statut — Expédiée',
    value: 'Expédiée',
    groupName: 'orders',
    screen: 'orders',
  },
  {
    key: 'orders.status.delivered',
    label: 'Statut — Livrée',
    value: 'Livrée',
    groupName: 'orders',
    screen: 'orders',
  },
  {
    key: 'orders.status.cancelled',
    label: 'Statut — Annulée',
    value: 'Annulée',
    groupName: 'orders',
    screen: 'orders',
  },

  // ── Compte ────────────────────────────────────────────────
  {
    key: 'account.title',
    label: 'Compte — Titre',
    value: 'Mon compte',
    groupName: 'account',
    screen: 'account',
  },
  {
    key: 'account.edit_profile',
    label: 'Compte — Modifier profil',
    value: 'Modifier mon profil',
    groupName: 'account',
    screen: 'account',
  },
  {
    key: 'account.logout',
    label: 'Compte — Déconnexion',
    value: 'Se déconnecter',
    groupName: 'account',
    screen: 'account',
  },
  {
    key: 'account.wishlist',
    label: 'Compte — Favoris',
    value: 'Mes favoris',
    groupName: 'account',
    screen: 'account',
  },

  // ── Textes communs ────────────────────────────────────────
  {
    key: 'common.save',
    label: 'Bouton — Enregistrer',
    value: 'Enregistrer',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.cancel',
    label: 'Bouton — Annuler',
    value: 'Annuler',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.confirm',
    label: 'Bouton — Confirmer',
    value: 'Confirmer',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.delete',
    label: 'Bouton — Supprimer',
    value: 'Supprimer',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.loading',
    label: 'Message — Chargement',
    value: 'Chargement…',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.error',
    label: 'Message — Erreur générique',
    value: 'Une erreur est survenue. Veuillez réessayer.',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.network_error',
    label: 'Message — Erreur réseau',
    value: 'Impossible de se connecter. Vérifiez votre connexion.',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.retry',
    label: 'Bouton — Réessayer',
    value: 'Réessayer',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.see_all',
    label: 'Bouton — Voir tout',
    value: 'Voir tout',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.close',
    label: 'Bouton — Fermer',
    value: 'Fermer',
    groupName: 'common',
    screen: 'global',
  },
  {
    key: 'common.share',
    label: 'Bouton — Partager',
    value: 'Partager',
    groupName: 'common',
    screen: 'global',
  },
];

async function main() {
  const client = await pool.connect();
  try {
    let inserted = 0;
    let skipped = 0;

    for (const block of TEXT_BLOCKS) {
      const res = await client.query(
        `INSERT INTO content_blocks (id, store_id, key, value, type, group_name, label, screen, is_active, created_at, updated_at)
         SELECT $1, $2, $3, $4, 'text', $5, $6, $7, true, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM content_blocks WHERE key = $3)`,
        [
          randomUUID(),
          SYSTEM_STORE_ID,
          block.key,
          block.value,
          block.groupName,
          block.label,
          block.screen,
        ],
      );
      if (res.rowCount && res.rowCount > 0) {
        inserted++;
        process.stdout.write('.');
      } else skipped++;
    }

    console.log(
      `\n\n✅ ${inserted} blocs de texte insérés, ${skipped} déjà existants ignorés.`,
    );
    console.log(`📋 Total : ${TEXT_BLOCKS.length} blocs définis`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  pool.end();
});
