import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeService } from './storeService';
import { useAuthStore } from '@/store/authStore';
import type {
  StoreCard,
  StoreGroup,
  StoreQuery,
  StoreProductQuery,
} from '@/infrastructure/data-source/StoreDataSource';

export function useStores(query?: StoreQuery) {
  return useQuery({
    queryKey: ['stores', query ?? {}],
    queryFn: () => storeService.getStores(query),
    staleTime: 0,
  });
}

export function useStoreGroups() {
  return useQuery({
    queryKey: ['store-groups'],
    queryFn: () => storeService.getStoreGroups(),
    staleTime: 0,
  });
}

export function useStoreDetail(id: string) {
  return useQuery({
    queryKey: ['store', id],
    queryFn: () => storeService.getStoreById(id),
    enabled: !!id,
  });
}

export function useStoreProducts(id: string, query?: StoreProductQuery) {
  return useQuery({
    queryKey: ['store', id, 'products', query ?? {}],
    queryFn: () => storeService.getStoreProducts(id, query),
    enabled: !!id,
  });
}

export function useStoreCategories(id: string) {
  return useQuery({
    queryKey: ['store', id, 'categories'],
    queryFn: () => storeService.getStoreCategories(id),
    enabled: !!id,
  });
}

export function useStoreBanners(id: string) {
  return useQuery({
    queryKey: ['store', id, 'banners'],
    queryFn: () => storeService.getStoreBanners(id),
    enabled: !!id,
  });
}

export function useStoreSections(id: string) {
  return useQuery({
    queryKey: ['store', id, 'sections'],
    queryFn: () => storeService.getStoreSections(id),
    enabled: !!id,
  });
}

export function useStorePaymentMethods(id: string) {
  return useQuery({
    queryKey: ['store', id, 'payment-methods'],
    queryFn: () => storeService.getStorePaymentMethods(id),
    enabled: !!id,
  });
}

export function useStoreFollowStatus(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['store', id, 'follow-status'],
    queryFn: () => storeService.getFollowStatus(id),
    enabled: !!id && isAuthenticated,
  });
}

/** Applique le like sur toutes les listes de boutiques déjà en cache. */
function patchStoreLists(
  qc: ReturnType<typeof useQueryClient>,
  storeId: string,
  follow: boolean,
) {
  const patch = (s: StoreCard) =>
    s.id === storeId
      ? {
          ...s,
          likedByMe: follow,
          followersCount: Math.max(0, s.followersCount + (follow ? 1 : -1)),
        }
      : s;

  qc.setQueriesData<StoreCard[]>({ queryKey: ['stores'] }, (list) =>
    Array.isArray(list) ? list.map(patch) : list,
  );
  // La même boutique peut figurer dans plusieurs sections de la vitrine : le
  // cœur doit basculer partout à la fois, pas seulement là où on a cliqué.
  qc.setQueriesData<StoreGroup[]>({ queryKey: ['store-groups'] }, (groups) =>
    Array.isArray(groups)
      ? groups.map((g) => ({ ...g, stores: g.stores.map(patch) }))
      : groups,
  );
}

/**
 * Suivre / ne plus suivre une boutique, avec mise à jour optimiste.
 * En cas d'échec réseau, les listes patchées sont restaurées depuis le snapshot.
 */
export function useToggleStoreLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, follow }: { storeId: string; follow: boolean }) =>
      storeService.toggleFollow(storeId, follow),

    onMutate: async ({ storeId, follow }) => {
      await qc.cancelQueries({ queryKey: ['stores'] });
      await qc.cancelQueries({ queryKey: ['store-groups'] });
      const snapshot = [
        ...qc.getQueriesData({ queryKey: ['stores'] }),
        ...qc.getQueriesData({ queryKey: ['store-groups'] }),
      ];
      const detail = qc.getQueryData(['store', storeId]);

      patchStoreLists(qc, storeId, follow);
      qc.setQueryData(['store', storeId], (prev: any) =>
        prev
          ? {
              ...prev,
              likedByMe: follow,
              followersCount: Math.max(0, prev.followersCount + (follow ? 1 : -1)),
            }
          : prev,
      );
      qc.setQueryData(['store', storeId, 'follow-status'], { following: follow });

      return { snapshot, detail };
    },

    onError: (_err, { storeId }, ctx) => {
      ctx?.snapshot.forEach(([key, value]) => qc.setQueryData(key, value));
      if (ctx?.detail !== undefined) qc.setQueryData(['store', storeId], ctx.detail);
      qc.invalidateQueries({ queryKey: ['store', storeId, 'follow-status'] });
    },

    onSettled: (_data, _err, { storeId }) => {
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['stores', 'followed'] });
      qc.invalidateQueries({ queryKey: ['store-groups'] });
      qc.invalidateQueries({ queryKey: ['store', storeId] });
      qc.invalidateQueries({ queryKey: ['home', 'stores'] });
    },
  });
}
