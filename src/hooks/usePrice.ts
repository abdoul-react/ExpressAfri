import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { formatPrice, formatAmount, convertFromUsd, formatPriceXof } from '@/utils/currency';

/** Formatage des prix dans la devise active de l'utilisateur. */
export function usePrice() {
  const currency = useSettingsStore((s) => s.currency);

  const price = useCallback((amountUsd: number) => formatPrice(amountUsd, currency), [currency]);
  const amount = useCallback((value: number) => formatAmount(value, currency), [currency]);
  const convert = useCallback((amountUsd: number) => convertFromUsd(amountUsd, currency), [currency]);
  /**
   * Formate un montant exprimé en XOF (FCFA) — à utiliser pour tous les prix
   * venant de la base de données (champ `priceUsd` dont le nom est trompeur).
   */
  const priceXof = useCallback((amountXof: number) => formatPriceXof(amountXof, currency), [currency]);

  return { price, amount, convert, priceXof, currency };
}
