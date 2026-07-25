import { CurrencyCode } from '@/utils/currency';

export type CountryCode = string;

export type Country = {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  dial: string;
  flag: string;
};

export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const c = (code: string, name: string, currency: CurrencyCode, dial: string): Country =>
  ({ code, name, currency, dial, flag: flagEmoji(code) });

export const COUNTRIES: Country[] = [
  // Afrique de l'Ouest
  c('NE', 'Niger', 'XOF', '+227'),
  c('ML', 'Mali', 'XOF', '+223'),
  c('SN', 'Sénégal', 'XOF', '+221'),
  c('BF', 'Burkina Faso', 'XOF', '+226'),
  c('CI', "Côte d'Ivoire", 'XOF', '+225'),
  c('BJ', 'Bénin', 'XOF', '+229'),
  c('TG', 'Togo', 'XOF', '+228'),
  c('GW', 'Guinée-Bissau', 'XOF', '+245'),
  c('NG', 'Nigeria', 'NGN', '+234'),
  c('GH', 'Ghana', 'GHS', '+233'),
  c('GN', 'Guinée', 'GNF', '+224'),
  c('SL', 'Sierra Leone', 'USD', '+232'),
  c('LR', 'Liberia', 'USD', '+231'),
  c('GM', 'Gambie', 'USD', '+220'),
  c('MR', 'Mauritanie', 'MAD', '+222'),
  c('CV', 'Cap-Vert', 'EUR', '+238'),
  // Afrique centrale
  c('CM', 'Cameroun', 'XAF', '+237'),
  c('TD', 'Tchad', 'XAF', '+235'),
  c('CF', 'Centrafrique', 'XAF', '+236'),
  c('GA', 'Gabon', 'XAF', '+241'),
  c('CG', 'Congo', 'XAF', '+242'),
  c('CD', 'RD Congo', 'CDF', '+243'),
  c('GQ', 'Guinée équatoriale', 'XAF', '+240'),
  c('ST', 'Sao Tomé-et-Principe', 'USD', '+239'),
  // Afrique du Nord
  c('MA', 'Maroc', 'MAD', '+212'),
  c('DZ', 'Algérie', 'DZD', '+213'),
  c('TN', 'Tunisie', 'TND', '+216'),
  c('LY', 'Libye', 'USD', '+218'),
  c('EG', 'Égypte', 'EGP', '+20'),
  c('SD', 'Soudan', 'USD', '+249'),
  // Afrique de l'Est
  c('ET', 'Éthiopie', 'ETB', '+251'),
  c('KE', 'Kenya', 'KES', '+254'),
  c('TZ', 'Tanzanie', 'TZS', '+255'),
  c('UG', 'Ouganda', 'UGX', '+256'),
  c('RW', 'Rwanda', 'RWF', '+250'),
  c('BI', 'Burundi', 'USD', '+257'),
  c('SS', 'Soudan du Sud', 'USD', '+211'),
  c('ER', 'Érythrée', 'USD', '+291'),
  c('DJ', 'Djibouti', 'USD', '+253'),
  c('SO', 'Somalie', 'USD', '+252'),
  c('MG', 'Madagascar', 'MGA', '+261'),
  c('MU', 'Maurice', 'MUR', '+230'),
  c('SC', 'Seychelles', 'USD', '+248'),
  c('KM', 'Comores', 'USD', '+269'),
  // Afrique australe
  c('ZA', 'Afrique du Sud', 'ZAR', '+27'),
  c('ZM', 'Zambie', 'ZMW', '+260'),
  c('ZW', 'Zimbabwe', 'USD', '+263'),
  c('MZ', 'Mozambique', 'MZN', '+258'),
  c('AO', 'Angola', 'AOA', '+244'),
  c('NA', 'Namibie', 'ZAR', '+264'),
  c('BW', 'Botswana', 'BWP', '+267'),
  c('LS', 'Lesotho', 'ZAR', '+266'),
  c('SZ', 'Eswatini', 'ZAR', '+268'),
  c('MW', 'Malawi', 'USD', '+265'),
  // Grandes places mondiales
  c('FR', 'France', 'EUR', '+33'),
  c('US', 'États-Unis', 'USD', '+1'),
  c('GB', 'Royaume-Uni', 'GBP', '+44'),
  c('DE', 'Allemagne', 'EUR', '+49'),
  c('CN', 'Chine', 'CNY', '+86'),
  c('AE', 'Émirats arabes unis', 'AED', '+971'),
  c('TR', 'Turquie', 'TRY', '+90'),
  c('IN', 'Inde', 'INR', '+91'),
  c('CA', 'Canada', 'CAD', '+1'),
  c('BR', 'Brésil', 'USD', '+55'),
];
