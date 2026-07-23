// Exports du service de contenu
export { contentService } from './contentService';

// Types depuis l'infrastructure
export type { Shortcut, SuggestedPerson, FeedSection } from '@/infrastructure/data-source';

// Hooks CMS
// IMPORTANT : chaque hook importe directement depuis ses dépendances (pas via ce barrel)
// pour éviter les cycles de dépendances détectés par Metro.
export { useAppSettings } from './useAppSettings';
export { useFeatureFlags } from './useFeatureFlags';
export { useAppLogos } from './useAppLogos';

// Marque (logo + nom bicolore pilotés par le CMS)
export { BrandMark, BrandName, useBrandColors, useBrandLogo } from './brand';

// useAccountBanners : NE PAS ré-exporter ici pour éviter le cycle Metro :
//   index.ts -> useAccountBanners.ts -> contentService.ts -> index.ts
// Importer directement :
//   import { useAccountBanners } from '@/features/content/useAccountBanners'
