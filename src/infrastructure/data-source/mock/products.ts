import { Product } from '@/types';

const TITLES = [
  'Coque MacBook Pro cristal ultra-fine',
  'Micro-cravate sans fil Lavalier 2.4G',
  'Chargeur rapide 240W GaN 3 ports USB-C',
  'Tondeuse à cheveux professionnelle Vintage T9',
  "Barre LED tactile 3 couleurs à capteur de mouvement",
  'Mini modèle boisson Cola réaliste 32mm',
  'Bouilloire électrique intelligente 2.0L',
  'Autocuiseur en aluminium 5L',
  'Ensemble de lingerie en dentelle',
  'Jean baggy déchiré tendance',
  'Smartphone 6.7" 256Go double SIM',
  'Baskets décontractées respirantes',
  'Parfum floral longue tenue 50ml',
  'Kit de tournevis de précision 24 en 1',
  'Montre connectée sport étanche',
  'Écouteurs Bluetooth réduction de bruit',
  'Sac à main cuir PU élégant',
  'Lampe de bureau LED pliable USB',
  'Robe d’été fluide col V',
  'Support téléphone voiture magnétique',
];

const CATEGORY_IDS = [
  'phones', 'phones', 'appliances', 'beauty', 'appliances',
  'toys', 'appliances', 'appliances', 'womensClothing', 'mensClothing',
  'phones', 'shoes', 'beauty', 'automobile', 'phones',
  'phones', 'womensClothing', 'furniture', 'womensClothing', 'automobile',
];

const COLORS = ['#1A1A1A', '#E8590C', '#0DB02B', '#3B82F6', '#EC4899', '#FBBF24'];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function makeVariants(index: number) {
  const groups = [];
  if (index % 2 === 0) {
    groups.push({
      key: 'color',
      labelKey: 'product.color',
      options: COLORS.slice(0, 3 + (index % 3)).map((c, i) => ({
        id: `color-${i}`,
        label: `Couleur ${i + 1}`,
        swatch: c,
      })),
    });
  }
  if (index % 3 === 0) {
    groups.push({
      key: 'size',
      labelKey: 'product.size',
      options: SIZES.slice(0, 3 + (index % 2)).map((s, i) => ({ id: `size-${i}`, label: s })),
    });
  }
  return groups.length ? groups : undefined;
}

export const PRODUCTS: Product[] = TITLES.map((title, i) => {
  const priceUsd = Number((0.5 + (i * 3.13) % 40).toFixed(2));
  const hasDiscount = i % 3 !== 0;
  const originalPriceUsd = hasDiscount ? Number((priceUsd * 1.6).toFixed(2)) : undefined;
  const discountPercent = originalPriceUsd
    ? Math.round((1 - priceUsd / originalPriceUsd) * 100)
    : undefined;
  const soldCount = [1000, 3000, 4000, 10000, 100000][i % 5];

  return {
    id: `p${i + 1}`,
    title,
    images: [
      `https://picsum.photos/seed/afx${i}a/600`,
      `https://picsum.photos/seed/afx${i}b/600`,
      `https://picsum.photos/seed/afx${i}c/600`,
    ],
    priceUsd,
    originalPriceUsd,
    discountPercent,
    rating: Number((4 + ((i * 0.07) % 1)).toFixed(1)),
    reviewCount: 50 + ((i * 137) % 5000),
    soldCount,
    categoryId: CATEGORY_IDS[i],
    freeShipping: i % 2 === 0,
    isNewBuyerDeal: i % 4 === 0,
    isChoice: i % 5 === 0,
    badges: i % 5 === 0 ? ['Choice'] : undefined,
    variants: makeVariants(i),
    specs: [
      { label: 'Marque', value: 'AfriExpress Select' },
      { label: 'Expédition', value: 'Depuis la Chine' },
      { label: 'Garantie', value: '90 jours' },
    ],
    description:
      "Produit de qualité soigneusement sélectionné pour le marché africain. Expédition rapide et suivie, protection acheteur incluse. Satisfait ou remboursé sous 90 jours.",
  };
});

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return PRODUCTS.filter((p) => p.categoryId === categoryId);
}
