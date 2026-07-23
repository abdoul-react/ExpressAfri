import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog'
import { contentService } from '@/features/content'

export function useHomeFeed(activeCat: string | null, activeTab: 'forYou' | 'deals' = 'forYou') {
  const productsQ = useQuery({ queryKey: ['products'], queryFn: () => catalogService.getProducts() })
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: () => catalogService.getCategories() })
  // Carrousel du haut : uniquement les bannières ciblées "home"
  const bannersQ = useQuery({ queryKey: ['banners', 'home'], queryFn: () => contentService.getBanners('home'), refetchInterval: 30_000 })
  // Les sections retournent leurs items hydratés depuis l'API (produits taggés, bannières "feed")
  // refetchInterval: 15s pour que les changements CMS (endDate, nouvelle section) s'affichent sans pull-to-refresh
  const sectionsQ = useQuery({ queryKey: ['feed-sections'], queryFn: () => contentService.getFeedSections(), refetchInterval: 15_000 })

  const products = productsQ.data ?? []
  const categories = categoriesQ.data ?? []
  const banners = bannersQ.data ?? []
  const sections = (sectionsQ.data ?? []) as any[]

  // Chaque section enrichit ses items depuis l'API — pas besoin de les reconstruire ici
  const dynamicSections = sections.map((section) => {
    // Pour les sections products/banners : items déjà chargés par l'API
    // Si items absents (vieux format), fallback sur les produits globaux
    if (section.type === 'products' && !section.items) {
      return { ...section, items: products.slice(0, 6) }
    }
    if (section.type === 'categories') {
      return { ...section, items: categories }
    }
    return section
  })

  const bundle = products.slice(0, 6)
  const deals = products.slice(6, 12)
  // Grille principale selon l'onglet actif :
  // - catégorie sélectionnée → UNIQUEMENT ses produits (pas de mélange trompeur)
  // - onglet Promos → produits remisés, plus forte réduction d'abord
  // - sinon → tous les produits
  const grid = activeCat
    ? products.filter((p) => p.categoryId === activeCat)
    : activeTab === 'deals'
      ? products
          .filter((p) => (p.discountPercent ?? 0) > 0)
          .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
      : products

  // Les sections d'accueil ne concernent que l'onglet « Accueil » sans filtre
  const showSections = !activeCat && activeTab === 'forYou'

  const isLoading = productsQ.isLoading || categoriesQ.isLoading || bannersQ.isLoading || sectionsQ.isLoading

  return { bundle, deals, grid, categories, banners, sections: showSections ? dynamicSections : [], isLoading }
}
