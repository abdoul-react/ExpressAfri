export interface GeoCountry {
  code: string
  name: string
  flag: string
  regions: string[]
}

/**
 * Référentiel géographique des pays et régions couverts par ExpressAfri.
 * Aligné sur les zones de livraison définies dans mockShipping.ts.
 */
export const GEOGRAPHY: GeoCountry[] = [
  // ── Afrique de l'Ouest ──────────────────────────────────────────────────
  {
    code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮',
    regions: [
      'Abidjan - Cocody', 'Abidjan - Plateau', 'Abidjan - Marcory',
      'Abidjan - Yopougon', 'Abidjan - Treichville', 'Abidjan - Adjamé',
      'Abidjan - Koumassi', 'Abidjan - Port-Bouët', 'Abidjan - Abobo',
      'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Daloa',
    ],
  },
  {
    code: 'SN', name: 'Sénégal', flag: '🇸🇳',
    regions: [
      'Dakar - Plateau', 'Dakar - Médina', 'Dakar - Parcelles Assainies',
      'Dakar - Guédiawaye', 'Dakar - Pikine', 'Thiès', 'Saint-Louis',
      'Ziguinchor', 'Kaolack', 'Touba',
    ],
  },
  {
    code: 'ML', name: 'Mali', flag: '🇲🇱',
    regions: [
      'Bamako - ACI', 'Bamako - Hippodrome', 'Bamako - Hamdallaye',
      'Bamako - Badalabougou', 'Sikasso', 'Ségou', 'Mopti', 'Kayes',
    ],
  },
  {
    code: 'BF', name: 'Burkina Faso', flag: '🇧🇫',
    regions: [
      'Ouagadougou - Ouaga 2000', 'Ouagadougou - Dassasgho',
      'Ouagadougou - Karpala', 'Bobo-Dioulasso', 'Koudougou', 'Banfora',
    ],
  },
  {
    code: 'NE', name: 'Niger', flag: '🇳🇪',
    regions: ['Niamey - Centre', 'Niamey - Gamkallé', 'Agadez', 'Maradi', 'Zinder'],
  },
  {
    code: 'TG', name: 'Togo', flag: '🇹🇬',
    regions: ['Lomé - Centre', 'Lomé - Bè', 'Kpalimé', 'Sokodé', 'Kara'],
  },
  {
    code: 'BJ', name: 'Bénin', flag: '🇧🇯',
    regions: ['Cotonou - Centre', 'Cotonou - Akpakpa', 'Porto-Novo', 'Parakou', 'Abomey-Calavi'],
  },
  {
    code: 'GN', name: 'Guinée', flag: '🇬🇳',
    regions: ['Conakry - Kaloum', 'Conakry - Matam', 'Conakry - Ratoma', 'Kankan', 'Labé'],
  },
  {
    code: 'GH', name: 'Ghana', flag: '🇬🇭',
    regions: ['Accra - Centre', 'Accra - East Legon', 'Kumasi', 'Takoradi', 'Tamale'],
  },
  // ── Afrique Centrale ────────────────────────────────────────────────────
  {
    code: 'CM', name: 'Cameroun', flag: '🇨🇲',
    regions: [
      'Douala - Akwa', 'Douala - Bonanjo', 'Douala - Makepe',
      'Yaoundé - Centre', 'Yaoundé - Bastos', 'Bafoussam', 'Garoua',
    ],
  },
  {
    code: 'GA', name: 'Gabon', flag: '🇬🇦',
    regions: ['Libreville - Centre', 'Libreville - Akanda', 'Port-Gentil', 'Franceville'],
  },
  {
    code: 'CG', name: 'Congo', flag: '🇨🇬',
    regions: ['Brazzaville - Centre', 'Brazzaville - Poto-Poto', 'Pointe-Noire', 'Dolisie'],
  },
  {
    code: 'CD', name: 'RDC', flag: '🇨🇩',
    regions: ['Kinshasa - Gombe', 'Kinshasa - Lemba', 'Kinshasa - Ngaliema', 'Lubumbashi', 'Mbuji-Mayi'],
  },
  // ── Afrique de l'Est ────────────────────────────────────────────────────
  {
    code: 'KE', name: 'Kenya', flag: '🇰🇪',
    regions: ['Nairobi - CBD', 'Nairobi - Westlands', 'Nairobi - Karen', 'Mombasa', 'Kisumu'],
  },
  {
    code: 'UG', name: 'Ouganda', flag: '🇺🇬',
    regions: ['Kampala - Centre', 'Kampala - Nakawa', 'Entebbe', 'Jinja', 'Gulu'],
  },
  {
    code: 'TZ', name: 'Tanzanie', flag: '🇹🇿',
    regions: ['Dar es Salaam - Centre', 'Dar es Salaam - Kinondoni', 'Arusha', 'Mwanza', 'Dodoma'],
  },
  {
    code: 'RW', name: 'Rwanda', flag: '🇷🇼',
    regions: ['Kigali - Centre', 'Kigali - Nyarugenge', 'Kigali - Gasabo', 'Butare', 'Gisenyi'],
  },
]

/** Retourne la liste de tous les pays disponibles. */
export function getCountries(): Pick<GeoCountry, 'code' | 'name' | 'flag'>[] {
  return GEOGRAPHY.map(({ code, name, flag }) => ({ code, name, flag }))
}

/** Retourne les régions d'un pays par son code ISO. */
export function getRegionsByCountry(countryCode: string): string[] {
  return GEOGRAPHY.find((c) => c.code === countryCode)?.regions ?? []
}
