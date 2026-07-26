import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminStoreService } from '../services/adminStoreService'
import type { StoreQueryParams, UpdateStorePayload, StoreMediaType, CreateSectionPayload, UpdateSectionPayload, CreateStoreGroupPayload, UpdateStoreGroupPayload, CreateStorePaymentMethodPayload, UpdateStorePaymentMethodPayload } from '@/infrastructure/data-source/AdminStoreDataSource'

export function useAdminStores(params: StoreQueryParams) {
  return useQuery({
    queryKey: ['admin', 'stores', params],
    queryFn: () => adminStoreService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminStore(id: string) {
  return useQuery({
    queryKey: ['admin', 'store', id],
    queryFn: () => adminStoreService.getById(id),
    enabled: !!id,
  })
}

export function useUpdateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStorePayload }) =>
      adminStoreService.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'stores'] })
      qc.invalidateQueries({ queryKey: ['admin', 'store', id] })
    },
  })
}

export function useDeleteStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminStoreService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'stores'] })
    },
  })
}

export function useStoreMedia(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'store', storeId, 'media'],
    queryFn: () => adminStoreService.listMedia(storeId),
    enabled: !!storeId,
  })
}

/** Invalide la liste et le détail : logo et coverUrl y sont affichés. */
function useMediaInvalidation(storeId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId, 'media'] })
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId] })
    qc.invalidateQueries({ queryKey: ['admin', 'stores'] })
  }
}

export function useUploadStoreMedia(storeId: string) {
  const invalidate = useMediaInvalidation(storeId)
  return useMutation({
    mutationFn: ({ file, type, alt }: { file: File; type: StoreMediaType; alt?: string }) =>
      adminStoreService.uploadMedia(storeId, file, type, alt),
    onSuccess: invalidate,
  })
}

export function useReorderStoreMedia(storeId: string) {
  const invalidate = useMediaInvalidation(storeId)
  return useMutation({
    mutationFn: (ids: string[]) => adminStoreService.reorderMedia(storeId, ids),
    onSuccess: invalidate,
  })
}

export function useDeleteStoreMedia(storeId: string) {
  const invalidate = useMediaInvalidation(storeId)
  return useMutation({
    mutationFn: (mediaId: string) => adminStoreService.deleteMedia(storeId, mediaId),
    onSuccess: invalidate,
  })
}

// ─── Sections de catalogue ────────────────────────────────────────────────────

export function useStoreSections(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'store', storeId, 'sections'],
    queryFn: () => adminStoreService.listSections(storeId),
    enabled: !!storeId,
  })
}

/** Le compteur de produits vit sur la section : toute mutation d'item la périme aussi. */
function useSectionInvalidation(storeId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId, 'sections'] })
  }
}

export function useCreateStoreSection(storeId: string) {
  const invalidate = useSectionInvalidation(storeId)
  return useMutation({
    mutationFn: (payload: CreateSectionPayload) => adminStoreService.createSection(storeId, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateStoreSection(storeId: string) {
  const invalidate = useSectionInvalidation(storeId)
  return useMutation({
    mutationFn: ({ sectionId, payload }: { sectionId: string; payload: UpdateSectionPayload }) =>
      adminStoreService.updateSection(storeId, sectionId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteStoreSection(storeId: string) {
  const invalidate = useSectionInvalidation(storeId)
  return useMutation({
    mutationFn: (sectionId: string) => adminStoreService.deleteSection(storeId, sectionId),
    onSuccess: invalidate,
  })
}

export function useReorderStoreSections(storeId: string) {
  const invalidate = useSectionInvalidation(storeId)
  return useMutation({
    mutationFn: (ids: string[]) => adminStoreService.reorderSections(storeId, ids),
    onSuccess: invalidate,
  })
}

export function useStoreSectionItems(storeId: string, sectionId: string) {
  return useQuery({
    queryKey: ['admin', 'store', storeId, 'sections', sectionId, 'items'],
    queryFn: () => adminStoreService.listSectionItems(storeId, sectionId),
    enabled: !!storeId && !!sectionId,
  })
}

function useSectionItemInvalidation(storeId: string, sectionId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId, 'sections', sectionId, 'items'] })
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId, 'sections'] })
  }
}

export function useAddStoreSectionItems(storeId: string, sectionId: string) {
  const invalidate = useSectionItemInvalidation(storeId, sectionId)
  return useMutation({
    mutationFn: (productIds: string[]) => adminStoreService.addSectionItems(storeId, sectionId, productIds),
    onSuccess: invalidate,
  })
}

export function useRemoveStoreSectionItem(storeId: string, sectionId: string) {
  const invalidate = useSectionItemInvalidation(storeId, sectionId)
  return useMutation({
    mutationFn: (itemId: string) => adminStoreService.removeSectionItem(storeId, sectionId, itemId),
    onSuccess: invalidate,
  })
}

export function useReorderStoreSectionItems(storeId: string, sectionId: string) {
  const invalidate = useSectionItemInvalidation(storeId, sectionId)
  return useMutation({
    mutationFn: (ids: string[]) => adminStoreService.reorderSectionItems(storeId, sectionId, ids),
    onSuccess: invalidate,
  })
}

// ─── Sections de la liste des boutiques (vitrine) ─────────────────────────────
// Clés sans storeId : ces sections sont transverses à la plateforme.

export function useStoreGroups() {
  return useQuery({
    queryKey: ['admin', 'store-groups'],
    queryFn: () => adminStoreService.listStoreGroups(),
  })
}

/** Le compteur de boutiques vit sur la section : toute mutation d'item la périme. */
function useStoreGroupInvalidation() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'store-groups'] })
  }
}

export function useCreateStoreGroup() {
  const invalidate = useStoreGroupInvalidation()
  return useMutation({
    mutationFn: (payload: CreateStoreGroupPayload) => adminStoreService.createStoreGroup(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateStoreGroup() {
  const invalidate = useStoreGroupInvalidation()
  return useMutation({
    mutationFn: ({ groupId, payload }: { groupId: string; payload: UpdateStoreGroupPayload }) =>
      adminStoreService.updateStoreGroup(groupId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteStoreGroup() {
  const invalidate = useStoreGroupInvalidation()
  return useMutation({
    mutationFn: (groupId: string) => adminStoreService.deleteStoreGroup(groupId),
    onSuccess: invalidate,
  })
}

export function useReorderStoreGroups() {
  const invalidate = useStoreGroupInvalidation()
  return useMutation({
    mutationFn: (ids: string[]) => adminStoreService.reorderStoreGroups(ids),
    onSuccess: invalidate,
  })
}

export function useStoreGroupItems(groupId: string) {
  return useQuery({
    queryKey: ['admin', 'store-groups', groupId, 'stores'],
    queryFn: () => adminStoreService.listStoreGroupItems(groupId),
    enabled: !!groupId,
  })
}

function useStoreGroupItemInvalidation(groupId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'store-groups', groupId, 'stores'] })
    qc.invalidateQueries({ queryKey: ['admin', 'store-groups'] })
  }
}

export function useAddStoreGroupItems(groupId: string) {
  const invalidate = useStoreGroupItemInvalidation(groupId)
  return useMutation({
    mutationFn: (storeIds: string[]) => adminStoreService.addStoreGroupItems(groupId, storeIds),
    onSuccess: invalidate,
  })
}

export function useRemoveStoreGroupItem(groupId: string) {
  const invalidate = useStoreGroupItemInvalidation(groupId)
  return useMutation({
    mutationFn: (itemId: string) => adminStoreService.removeStoreGroupItem(groupId, itemId),
    onSuccess: invalidate,
  })
}

export function useReorderStoreGroupItems(groupId: string) {
  const invalidate = useStoreGroupItemInvalidation(groupId)
  return useMutation({
    mutationFn: (ids: string[]) => adminStoreService.reorderStoreGroupItems(groupId, ids),
    onSuccess: invalidate,
  })
}

// ─── Moyens de paiement (cloisonnés au boutiquier) ────────────────────────────

/** Catalogue des providers autorisés par l'admin central. */
export function useStorePaymentProviders(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'store', storeId, 'payment-providers'],
    queryFn: () => adminStoreService.listPaymentProviders(storeId),
    enabled: !!storeId,
  })
}

export function useStorePaymentMethods(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'store', storeId, 'payment-methods'],
    queryFn: () => adminStoreService.listPaymentMethods(storeId),
    enabled: !!storeId,
  })
}

function usePaymentMethodInvalidation(storeId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId, 'payment-methods'] })
  }
}

export function useCreateStorePaymentMethod(storeId: string) {
  const invalidate = usePaymentMethodInvalidation(storeId)
  return useMutation({
    mutationFn: (payload: CreateStorePaymentMethodPayload) =>
      adminStoreService.createPaymentMethod(storeId, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateStorePaymentMethod(storeId: string) {
  const invalidate = usePaymentMethodInvalidation(storeId)
  return useMutation({
    mutationFn: ({ methodId, payload }: { methodId: string; payload: UpdateStorePaymentMethodPayload }) =>
      adminStoreService.updatePaymentMethod(storeId, methodId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteStorePaymentMethod(storeId: string) {
  const invalidate = usePaymentMethodInvalidation(storeId)
  return useMutation({
    mutationFn: (methodId: string) => adminStoreService.deletePaymentMethod(storeId, methodId),
    onSuccess: invalidate,
  })
}

export function useReorderStorePaymentMethods(storeId: string) {
  const invalidate = usePaymentMethodInvalidation(storeId)
  return useMutation({
    mutationFn: (ids: string[]) => adminStoreService.reorderPaymentMethods(storeId, ids),
    onSuccess: invalidate,
  })
}

/** Ne modifie rien : ne déclenche donc aucune invalidation. */
export function useValidateStorePaymentMethod(storeId: string) {
  return useMutation({
    mutationFn: (methodId: string) => adminStoreService.validatePaymentMethod(storeId, methodId),
  })
}
