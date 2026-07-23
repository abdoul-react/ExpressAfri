export const MOCK_APP_SETTINGS = [
  // ── Général ──
  { key: 'app.name', value: 'ExpressAfri', type: 'text', label: "Nom de l'application", group: 'general', description: 'Le nom affiché partout dans l\'application' },
  { key: 'app.tagline', value: 'China at your door', type: 'text', label: 'Tagline', group: 'general', description: 'Slogan de l\'application' },
  { key: 'app.email', value: 'support@expressafri.com', type: 'text', label: 'Email support', group: 'general', description: 'Adresse email du service client' },
  { key: 'app.phone', value: '+225 01 02 03 04 05', type: 'text', label: 'Téléphone support', group: 'general', description: 'Numéro de téléphone du service client' },
  { key: 'app.address', value: 'Abidjan, Côte d\'Ivoire', type: 'text', label: 'Adresse', group: 'general', description: 'Adresse physique de l\'entreprise' },
  { key: 'app.version', value: '1.0.0', type: 'text', label: 'Version app', group: 'general' },
  { key: 'app.defaultCurrency', value: 'XOF', type: 'select', label: 'Devise par défaut', group: 'general', options: ['XOF', 'XAF', 'CDF', 'GNF', 'MGA', 'USD', 'EUR'] },
  { key: 'app.defaultLanguage', value: 'fr', type: 'select', label: 'Langue par défaut', group: 'general', options: ['fr', 'en', 'pt', 'ar'] },

  // ── Livraison ──
  { key: 'shipping.freeThreshold', value: '3', type: 'number', label: 'Seuil livraison gratuite (articles)', group: 'shipping', description: 'Nombre d\'articles pour livraison gratuite' },
  { key: 'shipping.expressDays', value: '7-10', type: 'text', label: 'Délai express (jours)', group: 'shipping' },
  { key: 'shipping.standardDays', value: '9-19', type: 'text', label: 'Délai standard (jours)', group: 'shipping' },
  { key: 'shipping.economyDays', value: '20-30', type: 'text', label: 'Délai économique (jours)', group: 'shipping' },
  { key: 'shipping.returnDays', value: '90', type: 'number', label: 'Délai retour (jours)', group: 'shipping', description: 'Nombre de jours pour retourner un produit' },

  // ── Paiement ──
  { key: 'payment.methods', value: 'wave,orange-money,moov-money,mtn-money,visa,mastercard,cod', type: 'text', label: 'Moyens de paiement actifs', group: 'payment', description: 'Séparés par des virgules' },
  { key: 'payment.waveFee', value: '1.5', type: 'number', label: 'Frais Wave (%)', group: 'payment' },
  { key: 'payment.orangeFee', value: '1.5', type: 'number', label: 'Frais Orange Money (%)', group: 'payment' },
  { key: 'payment.cardFee', value: '2.5', type: 'number', label: 'Frais carte bancaire (%)', group: 'payment' },

  // ── Réseaux sociaux ──
  { key: 'social.facebook', value: 'https://facebook.com/expressafri', type: 'text', label: 'Page Facebook', group: 'social' },
  { key: 'social.instagram', value: 'https://instagram.com/expressafri', type: 'text', label: 'Compte Instagram', group: 'social' },
  { key: 'social.twitter', value: 'https://twitter.com/expressafri', type: 'text', label: 'Compte Twitter/X', group: 'social' },
  { key: 'social.tiktok', value: 'https://tiktok.com/@expressafri', type: 'text', label: 'Compte TikTok', group: 'social' },
  { key: 'social.whatsapp', value: '+2250102030405', type: 'text', label: 'Numéro WhatsApp', group: 'social' },

  // ── SEO ──
  { key: 'seo.homeTitle', value: 'ExpressAfri - China at your door', type: 'text', label: 'Titre SEO Accueil', group: 'seo' },
  { key: 'seo.homeDescription', value: 'Achetez des millions de produits en provenance de Chine, livrés dans toute l\'Afrique. Paiement sécurisé, livraison trackée.', type: 'text', label: 'Description SEO Accueil', group: 'seo' },
  { key: 'seo.homeKeywords', value: 'expressafri, shopping, ecommerce, afrique, chine, import', type: 'text', label: 'Mots-clés SEO Accueil', group: 'seo' },

  // ── Fonctionnalités ──
  { key: 'feature.walletEnabled', value: 'true', type: 'boolean', label: 'Portefeuille ExpressAfri', group: 'features', description: 'Activer le wallet pour les utilisateurs' },
  { key: 'feature.photoSearchEnabled', value: 'true', type: 'boolean', label: 'Recherche par photo', group: 'features', description: 'Activer la recherche par image' },
  { key: 'feature.feedEnabled', value: 'true', type: 'boolean', label: 'Feed inspiration', group: 'features', description: 'Activer le flux de contenu' },
  { key: 'feature.guestCheckout', value: 'true', type: 'boolean', label: 'Commander sans compte', group: 'features', description: 'Permettre le checkout invité' },
  { key: 'feature.referralEnabled', value: 'true', type: 'boolean', label: 'Parrainage', group: 'features', description: 'Activer le programme de parrainage' },
  { key: 'feature.referralBonus', value: '5', type: 'number', label: 'Bonus parrainage ($)', group: 'features' },
  { key: 'feature.newBuyerDiscount', value: '20', type: 'number', label: 'Réduction nouveau client (%)', group: 'features' },

  // ── Apparence ──
  { key: 'theme.primaryColor', value: '#E53935', type: 'color', label: 'Couleur primaire', group: 'appearance', description: 'Couleur principale de l\'application' },
  { key: 'theme.secondaryColor', value: '#FF6F00', type: 'color', label: 'Couleur secondaire', group: 'appearance' },
  { key: 'theme.backgroundColor', value: '#FFFFFF', type: 'color', label: 'Couleur de fond', group: 'appearance' },
  { key: 'theme.darkModeEnabled', value: 'true', type: 'boolean', label: 'Mode sombre disponible', group: 'appearance' },
]
