import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/features/catalog';
import type { Category, Product } from '@/types';

const RECOMMENDED_COUNT = 20;

/**
 * Logique de données de l'écran Boutique.
 *
 * Quand activeId est défini, les produits sont chargés depuis l'API avec le
 * filtre categoryId → le filtrage se fait côté serveur, pas en mémoire.
 * Cela garantit que changer de catégorie montre vraiment les bons produits.
 *
 * Deux flux distincts :
 *  - `categoryProducts` : les produits attribués à la catégorie sélectionnée ;
 *  - `recommended`      : le reste du catalogue (hors catégorie active) —
 *    affiché dans « Recommandé pour vous », activable par l'admin
 *    (clé app_settings `shop.showRecommended`).
 */
export function useStoreCatalog(activeId: string) {
  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogService.getCategories(),
  });

  // Produits de la catégorie active — refetch à chaque changement d'activeId
  const productsQ = useQuery({
    queryKey: ['products', 'category', activeId],
    queryFn: () => catalogService.getByCategory(activeId),
    enabled: !!activeId,
  });

  // Catalogue général — source des recommandations, indépendant de la catégorie
  const allProductsQ = useQuery({
    queryKey: ['products'],
    queryFn: () => catalogService.getProducts(),
  });

  // Sous-catégories de la catégorie active
  const subsQ = useQuery({
    queryKey: ['subcategories', activeId],
    queryFn: () => catalogService.getSubcategories(activeId),
    enabled: !!activeId,
  });

  const categories: Category[] = categoriesQ.data ?? [];
  const active = categories.find((c) => c.id === activeId) ?? null;

  const subs: { id: string; name: string; image?: string }[] = subsQ.data ?? [];

  const categoryProducts: Product[] = productsQ.data ?? [];

  // Recommandé = l'ensemble des AUTRES produits (jamais ceux de la catégorie
  // affichée juste au-dessus, pour ne pas dupliquer la sélection en cours).
  const allProducts: Product[] = allProductsQ.data ?? [];
  const recommended = allProducts
    .filter((p) => p.categoryId !== activeId)
    .slice(0, RECOMMENDED_COUNT);

  return {
    categories,
    active,
    subs,
    categoryProducts,
    recommended,
    isLoading: categoriesQ.isLoading || (!!activeId && productsQ.isLoading),
    isRefetching: productsQ.isFetching,
  };
}
