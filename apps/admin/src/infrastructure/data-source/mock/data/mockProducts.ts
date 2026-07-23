export const MOCK_PRODUCTS = [
  // Produits en attente de modération
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `prod_pending_${i + 1}`,
    name: ['Ensemble Bazin Brodé', 'Sac en Raffia', 'Parure de Lit Wax', 'Boucles d\'Oreilles Massaï', 'Huile de Karité Bio'][i],
    description: 'Produit soumis par le vendeur, en attente de vérification.',
    price: [85000, 25000, 45000, 12000, 7500][i],
    compareAtPrice: undefined,
    categoryId: `cat_${i + 1}`,
    category: ['Vêtements', 'Accessoires', 'Tissus', 'Bijoux', 'Maison'][i],
    images: [`https://picsum.photos/seed/pending_${i + 1}/400/400`],
    stock: [15, 30, 10, 50, 100][i],
    sku: `SKU-PENDING-${i + 1}`,
    isActive: false,
    storeId: [`store_002`, `store_002`, `store_005`, `store_006`, `store_008`][i],
    storeName: ['Mode & Élégance', 'Mode & Élégance', 'Saveurs du Niger', 'Déco Maison Niger', 'Cosmétiques Naturels'][i],
    moderationStatus: 'pending',
    rejectionReason: undefined,
    createdAt: new Date(2026, 6, 10 + i).toISOString(),
    updatedAt: new Date(2026, 6, 10 + i).toISOString(),
  })),
  // Produits existants (dont 3 avec variantes)
  ...Array.from({ length: 48 }, (_, i) => {
    const name = [
      'T-shirt Niger Classique',
      'Chemise Bazin Rich',
      'Pagne Wax Traditionnel',
      ' ensemble Boubou Élégant',
      'Robe Africaine Brodée',
      'Costume Kente Premium',
      'Sac à Main en Cuir',
      'Chaussures Artisanales',
      'Collier Perles Massaï',
      'Bracelet Aka',
      'Écharpe en Soie',
      'Chapeau Kufi',
    ][i % 12]

    const variants = i < 3 ? [
      { id: `var_${i}_1`, sku: `${name.slice(0, 3).toUpperCase()}-S`, price: [15000, 45000, 25000][i], stock: 10, attributes: [{ name: 'Taille', value: 'S' }, { name: 'Couleur', value: 'Blanc' }], isActive: true },
      { id: `var_${i}_2`, sku: `${name.slice(0, 3).toUpperCase()}-M`, price: [15000, 45000, 25000][i], stock: 15, attributes: [{ name: 'Taille', value: 'M' }, { name: 'Couleur', value: 'Noir' }], isActive: true },
      { id: `var_${i}_3`, sku: `${name.slice(0, 3).toUpperCase()}-L`, price: [16500, 48000, 27000][i], stock: 8, attributes: [{ name: 'Taille', value: 'L' }, { name: 'Couleur', value: 'Noir' }], isActive: true },
      { id: `var_${i}_4`, sku: `${name.slice(0, 3).toUpperCase()}-XL`, price: [17500, 52000, 29000][i], stock: 5, attributes: [{ name: 'Taille', value: 'XL' }, { name: 'Couleur', value: 'Blanc' }], isActive: true },
    ] : undefined

    return {
      id: `prod_${String(i + 1).padStart(4, '0')}`,
      name,
      description: 'Produit artisanal de qualité supérieure, fabriqué avec des matériaux nobles et traditionnels.',
      price: [15000, 45000, 25000, 65000, 55000, 120000, 35000, 40000, 8500, 6500, 18000, 9500][i % 12],
      compareAtPrice: i % 3 === 0 ? [18000, 55000, 30000][i % 3] : undefined,
      categoryId: `cat_${(i % 6) + 1}`,
      category: ['Vêtements', 'Accessoires', 'Tissus', 'Chaussures', 'Bijoux', 'Maison'][i % 6],
      images: [`https://picsum.photos/seed/${i + 1}/400/400`],
      stock: Math.floor(Math.random() * 100) + 1,
      sku: `SKU-NGR-${String(i + 1).padStart(4, '0')}`,
      isActive: i % 10 !== 0,
      storeId: [`store_001`, `store_003`, `store_004`, `store_007`][i % 4],
      storeName: ['Artisanat Niger', 'Bijoux du Sahel', 'Tissus Africains', 'Chaussures Traditionnelles'][i % 4],
      moderationStatus: 'approved',
      rejectionReason: undefined,
      variants,
      createdAt: new Date(2026, 0, 1 + Math.floor(i / 2)).toISOString(),
      updatedAt: new Date(2026, 6, 1 + Math.floor(i / 3)).toISOString(),
    }
  }),
]
