import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchServerAddresses,
  isLocalId,
  pushCreate,
  pushDelete,
  pushSetDefault,
  pushUpdate,
} from '@/features/address/addressSync';

export type Address = {
  id: string;
  countryCode: string;
  contactName: string;
  dialCode: string;
  phone: string;
  street: string;
  apartment?: string;
  province: string;
  city: string;
  postalCode: string;
};

type AddressState = {
  addresses: Address[];
  defaultId: string | null;
  add: (address: Omit<Address, 'id'>, makeDefault?: boolean) => string;
  update: (id: string, patch: Partial<Omit<Address, 'id'>>) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
  /** Remplace tout le contenu local par l'état serveur (connexion). */
  hydrateFromServer: (addresses: Address[], defaultId: string | null) => void;
};

/**
 * Adresses de livraison : le store local reste la source d'affichage (l'app
 * marche hors-ligne et en invité), et chaque opération est répliquée vers
 * l'API en arrière-plan quand une session cliente existe — voir
 * `features/address/addressSync.ts`. À la connexion, le serveur fait foi
 * (`syncAddressesFromServer`).
 */
export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      defaultId: null,

      add: (address, makeDefault = false) => {
        const id = `addr_${Date.now()}`;
        const isFirst = get().addresses.length === 0;
        const becomesDefault = makeDefault || isFirst;
        set((s) => ({
          addresses: [...s.addresses, { ...address, id }],
          defaultId: becomesDefault ? id : s.defaultId,
        }));
        // Réplication serveur : l'id provisoire est remplacé par l'UUID renvoyé
        void pushCreate(address, becomesDefault).then((serverId) => {
          if (!serverId) return;
          set((s) => ({
            addresses: s.addresses.map((a) => (a.id === id ? { ...a, id: serverId } : a)),
            defaultId: s.defaultId === id ? serverId : s.defaultId,
          }));
        });
        return id;
      },

      update: (id, patch) => {
        set((s) => ({
          addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
        const merged = get().addresses.find((a) => a.id === id);
        if (merged) {
          const { id: _id, ...payload } = merged;
          void pushUpdate(id, payload);
        }
      },

      remove: (id) => {
        set((s) => {
          const addresses = s.addresses.filter((a) => a.id !== id);
          const defaultId =
            s.defaultId === id ? (addresses[0]?.id ?? null) : s.defaultId;
          return { addresses, defaultId };
        });
        void pushDelete(id);
      },

      setDefault: (id) => {
        set({ defaultId: id });
        void pushSetDefault(id);
      },

      hydrateFromServer: (addresses, defaultId) => set({ addresses, defaultId }),
    }),
    {
      name: 'afriexpress-addresses',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Sélecteur : l'adresse par défaut (ou la première, ou null). */
export function getDefaultAddress(state: AddressState): Address | null {
  return (
    state.addresses.find((a) => a.id === state.defaultId) ??
    state.addresses[0] ??
    null
  );
}

/**
 * Synchronise le store avec le serveur pour le client connecté.
 * - Serveur non vide → le serveur fait foi (multi-appareils).
 * - Serveur vide mais adresses locales présentes → migration : on pousse le
 *   local vers le serveur (cas invité qui vient de créer un compte).
 * À appeler à la connexion / au démarrage d'une session authentifiée.
 */
export async function syncAddressesFromServer(): Promise<void> {
  const server = await fetchServerAddresses();
  if (!server) return; // invité, mock ou hors-ligne : on garde le local

  const { addresses: local, defaultId: localDefault, hydrateFromServer } =
    useAddressStore.getState();

  if (server.addresses.length > 0) {
    hydrateFromServer(server.addresses, server.defaultId);
    return;
  }

  // Serveur vide : pousser les adresses locales non synchronisées
  const pending = local.filter((a) => isLocalId(a.id));
  if (pending.length === 0) return;
  for (const a of pending) {
    const { id, ...payload } = a;
    await pushCreate(payload, id === localDefault);
  }
  const refreshed = await fetchServerAddresses();
  if (refreshed && refreshed.addresses.length > 0) {
    hydrateFromServer(refreshed.addresses, refreshed.defaultId);
  }
}
