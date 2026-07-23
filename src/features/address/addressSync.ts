import { addressDataSource } from '@/infrastructure/data-source';
import { isMock } from '@/infrastructure/mock';
import { logger } from '@/infrastructure/logging';
import { useAuthStore } from '@/store/authStore';
import { COUNTRIES } from '@/store/settingsStore';
import type { Address } from '@/store/addressStore';

/**
 * Synchronisation des adresses avec le serveur.
 *
 * Principe : le store local (AsyncStorage) reste la source d'affichage — l'app
 * fonctionne hors-ligne et pour les invités exactement comme avant. Quand une
 * session cliente existe, chaque opération est répliquée vers l'API
 * (/mobile/addresses) en arrière-plan, et la connexion re-hydrate le store
 * depuis le serveur (le serveur fait foi pour un compte connecté).
 *
 * C'est cette réplication qui permet à l'espace admin d'afficher ville, pays
 * et téléphone du client (lus depuis son adresse par défaut).
 */

/** Ids serveur = UUID ; ids locaux non encore synchronisés = "addr_<timestamp>". */
export function isLocalId(id: string): boolean {
  return id.startsWith('addr_');
}

function canSync(): boolean {
  const { isAuthenticated } = useAuthStore.getState();
  return isAuthenticated && !isMock();
}

/** Format local → payload serveur. Le téléphone part en international complet. */
function toServer(a: Omit<Address, 'id'> & { isDefault?: boolean }) {
  const phone = a.phone.startsWith('+') ? a.phone : `${a.dialCode} ${a.phone}`.trim();
  return {
    countryCode: a.countryCode,
    contactName: a.contactName,
    phone,
    street: a.street,
    apartment: a.apartment || undefined,
    province: a.province || undefined,
    city: a.city,
    postalCode: a.postalCode || undefined,
    isDefault: a.isDefault,
  };
}

/** Payload serveur → format local (dialCode retrouvé via le pays). */
function fromServer(raw: any): Address {
  const dial = COUNTRIES.find((c) => c.code === raw.countryCode)?.dial ?? '';
  let phone: string = raw.phone ?? '';
  // Retirer l'indicatif du numéro pour retrouver la saisie locale
  if (dial && phone.replace(/\s/g, '').startsWith(dial)) {
    phone = phone.replace(/\s/g, '').slice(dial.length);
  }
  return {
    id: raw.id,
    countryCode: raw.countryCode ?? '',
    contactName: raw.contactName ?? '',
    dialCode: dial,
    phone,
    street: raw.street ?? '',
    apartment: raw.apartment ?? undefined,
    province: raw.province ?? '',
    city: raw.city ?? '',
    postalCode: raw.postalCode ?? '',
  };
}

/**
 * Récupère les adresses serveur du client connecté.
 * Retourne null si la sync n'est pas applicable (invité, mock, erreur réseau).
 */
export async function fetchServerAddresses(): Promise<{
  addresses: Address[];
  defaultId: string | null;
} | null> {
  if (!canSync()) return null;
  try {
    const list = await addressDataSource.list('me');
    const rows = Array.isArray(list) ? list : [];
    const defaultRow = rows.find((r: any) => r.isDefault) ?? rows[0];
    return {
      addresses: rows.map(fromServer),
      defaultId: defaultRow?.id ?? null,
    };
  } catch (error) {
    logger.warn('[addressSync] fetch failed', { error });
    return null;
  }
}

/** Crée l'adresse côté serveur et retourne son id définitif (UUID), sinon null. */
export async function pushCreate(
  address: Omit<Address, 'id'>,
  makeDefault: boolean,
): Promise<string | null> {
  if (!canSync()) return null;
  try {
    const created: any = await addressDataSource.create('me', {
      ...(toServer({ ...address, isDefault: makeDefault }) as any),
    });
    return created?.id ?? null;
  } catch (error) {
    logger.warn('[addressSync] create failed', { error });
    return null;
  }
}

export async function pushUpdate(id: string, address: Omit<Address, 'id'>): Promise<void> {
  if (!canSync() || isLocalId(id)) return;
  try {
    await addressDataSource.update(id, 'me', toServer(address) as any);
  } catch (error) {
    logger.warn('[addressSync] update failed', { error });
  }
}

export async function pushDelete(id: string): Promise<void> {
  if (!canSync() || isLocalId(id)) return;
  try {
    await addressDataSource.delete(id, 'me');
  } catch (error) {
    logger.warn('[addressSync] delete failed', { error });
  }
}

export async function pushSetDefault(id: string): Promise<void> {
  if (!canSync() || isLocalId(id)) return;
  try {
    await addressDataSource.setDefault(id, 'me');
  } catch (error) {
    logger.warn('[addressSync] setDefault failed', { error });
  }
}
