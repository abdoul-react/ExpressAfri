import { Banner, FeedPost } from '@/types';

export const BANNERS: Banner[] = [
  {
    id: 'b1',
    title: 'Soldes d\'été',
    subtitle: 'Jusqu\'à -60% sur tout',
    discountLabel: '-60%',
    backgroundColor: '#FF6B35',
    linkUrl: '/search',
    ctaText: 'Découvrir',
  },
  {
    id: 'b2',
    title: 'Offres groupées',
    subtitle: '-3$ sur votre panier',
    discountLabel: '-3$',
    backgroundColor: '#FF8C00',
    linkUrl: '/search',
    ctaText: 'En profiter',
  },
  {
    id: 'b3',
    title: 'Vente flash',
    subtitle: 'Jusqu\'à -80%',
    discountLabel: '-80%',
    backgroundColor: '#E74C3C',
    linkUrl: '/search',
    ctaText: 'Voir les offres',
  },
];

export const FEED_POSTS: FeedPost[] = Array.from({ length: 16 }).map((_, i) => ({
  id: `f${i + 1}`,
  image: `https://picsum.photos/seed/feed${i}/400/560`,
  title: [
    'XJEDC Fidget Curseur jouet anti-stress en métal',
    'Meilleur chargeur téléphone sans fil 3-en-1',
    'Nouveau briquet turbo jet coupe-vent 2026',
    'Support magnétique premium pour bureau',
    'Mini caméra de surveillance HD discrète',
    'Organisateur de câbles en silicone',
  ][i % 6],
  author: ['ForInswork', 'Unique AI', 'ShenZhen FNKJ', 'enpropiamano', 'Alina_P', 'TechAfri'][i % 6],
  authorAvatar: `https://picsum.photos/seed/av${i}/80`,
  likes: 100 + ((i * 173) % 900),
  duration: i % 2 === 0 ? `00:${(10 + (i % 40)).toString().padStart(2, '0')}` : undefined,
  height: 280,
}));
