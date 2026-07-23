/**
 * Multi-devise — devise par défaut XOF (FCFA).
 * Les taux sont mockés ici ; ils viendront du backend plus tard.
 * Base des taux : 1 USD.
 */

export type CurrencyCode =
  // Afrique de l'Ouest / centrale
  | 'XOF' | 'XAF' | 'NGN' | 'GHS' | 'GNF' | 'CDF'
  // Afrique du Nord
  | 'MAD' | 'DZD' | 'TND' | 'EGP'
  // Afrique de l'Est / australe
  | 'KES' | 'TZS' | 'UGX' | 'RWF' | 'ETB' | 'ZAR' | 'ZMW' | 'MZN' | 'AOA' | 'BWP' | 'MGA' | 'MUR'
  // Internationales
  | 'USD' | 'EUR' | 'GBP' | 'CNY' | 'AED' | 'TRY' | 'INR' | 'CAD';

export type CurrencyInfo = {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** true → pas de décimales (FCFA, NGN). */
  noDecimals: boolean;
  /** Symbole après le montant ? */
  symbolAfter: boolean;
  /** Taux depuis 1 USD. */
  rateFromUsd: number;
};

// Devises les plus courantes en Afrique + internationales.
// Taux indicatifs (base 1 USD) ; ils viendront du backend à terme.
export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  XOF: { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (UEMOA)', noDecimals: true, symbolAfter: true, rateFromUsd: 600 },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (CEMAC)', noDecimals: true, symbolAfter: true, rateFromUsd: 600 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Naira nigérian', noDecimals: true, symbolAfter: false, rateFromUsd: 1550 },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Cedi ghanéen', noDecimals: false, symbolAfter: false, rateFromUsd: 15.5 },
  GNF: { code: 'GNF', symbol: 'FG', name: 'Franc guinéen', noDecimals: true, symbolAfter: true, rateFromUsd: 8600 },
  CDF: { code: 'CDF', symbol: 'FC', name: 'Franc congolais', noDecimals: true, symbolAfter: true, rateFromUsd: 2850 },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Dirham marocain', noDecimals: false, symbolAfter: true, rateFromUsd: 10 },
  DZD: { code: 'DZD', symbol: 'DA', name: 'Dinar algérien', noDecimals: false, symbolAfter: true, rateFromUsd: 134 },
  TND: { code: 'TND', symbol: 'DT', name: 'Dinar tunisien', noDecimals: false, symbolAfter: true, rateFromUsd: 3.1 },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Livre égyptienne', noDecimals: false, symbolAfter: false, rateFromUsd: 49 },
  KES: { code: 'KES', symbol: 'KSh', name: 'Shilling kényan', noDecimals: false, symbolAfter: false, rateFromUsd: 129 },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Shilling tanzanien', noDecimals: true, symbolAfter: false, rateFromUsd: 2700 },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Shilling ougandais', noDecimals: true, symbolAfter: false, rateFromUsd: 3700 },
  RWF: { code: 'RWF', symbol: 'FRw', name: 'Franc rwandais', noDecimals: true, symbolAfter: true, rateFromUsd: 1370 },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Birr éthiopien', noDecimals: false, symbolAfter: false, rateFromUsd: 120 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'Rand sud-africain', noDecimals: false, symbolAfter: false, rateFromUsd: 18 },
  ZMW: { code: 'ZMW', symbol: 'ZK', name: 'Kwacha zambien', noDecimals: false, symbolAfter: false, rateFromUsd: 27 },
  MZN: { code: 'MZN', symbol: 'MT', name: 'Metical mozambicain', noDecimals: false, symbolAfter: true, rateFromUsd: 64 },
  AOA: { code: 'AOA', symbol: 'Kz', name: 'Kwanza angolais', noDecimals: false, symbolAfter: true, rateFromUsd: 910 },
  BWP: { code: 'BWP', symbol: 'P', name: 'Pula botswanais', noDecimals: false, symbolAfter: false, rateFromUsd: 13.6 },
  MGA: { code: 'MGA', symbol: 'Ar', name: 'Ariary malgache', noDecimals: true, symbolAfter: true, rateFromUsd: 4600 },
  MUR: { code: 'MUR', symbol: 'Rs', name: 'Roupie mauricienne', noDecimals: false, symbolAfter: false, rateFromUsd: 46 },
  USD: { code: 'USD', symbol: '$', name: 'Dollar américain', noDecimals: false, symbolAfter: false, rateFromUsd: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', noDecimals: false, symbolAfter: true, rateFromUsd: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'Livre sterling', noDecimals: false, symbolAfter: false, rateFromUsd: 0.79 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Yuan chinois', noDecimals: false, symbolAfter: false, rateFromUsd: 7.2 },
  AED: { code: 'AED', symbol: 'AED', name: 'Dirham émirati', noDecimals: false, symbolAfter: true, rateFromUsd: 3.67 },
  TRY: { code: 'TRY', symbol: '₺', name: 'Livre turque', noDecimals: false, symbolAfter: false, rateFromUsd: 34 },
  INR: { code: 'INR', symbol: '₹', name: 'Roupie indienne', noDecimals: false, symbolAfter: false, rateFromUsd: 84 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Dollar canadien', noDecimals: false, symbolAfter: false, rateFromUsd: 1.37 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

/** La devise de référence des prix mock est l'USD. */
export function convertFromUsd(amountUsd: number, to: CurrencyCode): number {
  return amountUsd * CURRENCIES[to].rateFromUsd;
}

/**
 * Convertit un montant exprimé en XOF (FCFA) vers la devise cible.
 * C'est la conversion à utiliser pour les prix réels de la base de données,
 * qui sont stockés en FCFA dans le champ `priceUsd` (nom historique trompeur).
 */
export function convertFromXof(amountXof: number, to: CurrencyCode): number {
  if (to === 'XOF' || to === 'XAF') return amountXof;
  return (amountXof / CURRENCIES.XOF.rateFromUsd) * CURRENCIES[to].rateFromUsd;
}

function groupThousands(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Formate un montant (exprimé en USD) dans la devise cible.
 * Ex : formatPrice(0.99, 'XOF') → "594 FCFA"
 */
export function formatPrice(amountUsd: number, currency: CurrencyCode): string {
  const info = CURRENCIES[currency];
  const value = convertFromUsd(amountUsd, currency);
  const fixed = info.noDecimals ? Math.round(value).toString() : value.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = groupThousands(intPart);
  const num = decPart ? `${grouped}.${decPart}` : grouped;
  return info.symbolAfter ? `${num} ${info.symbol}` : `${info.symbol}${num}`;
}

/** Formate un montant déjà exprimé dans la devise cible (pas de conversion). */
export function formatAmount(value: number, currency: CurrencyCode): string {
  const info = CURRENCIES[currency];
  const fixed = info.noDecimals ? Math.round(value).toString() : value.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = groupThousands(intPart);
  const num = decPart ? `${grouped}.${decPart}` : grouped;
  return info.symbolAfter ? `${num} ${info.symbol}` : `${info.symbol}${num}`;
}

/**
 * Formate un montant exprimé en XOF (FCFA) dans la devise cible.
 * À utiliser pour tous les prix venant de la base de données (champ `priceUsd`
 * dont le nom est historiquement trompeur — la valeur est en FCFA).
 */
export function formatPriceXof(amountXof: number, currency: CurrencyCode): string {
  const converted = convertFromXof(amountXof, currency);
  return formatAmount(converted, currency);
}
