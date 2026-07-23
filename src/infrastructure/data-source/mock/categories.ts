import { Category } from '@/types';
import { IconName } from '@/icons';

export const HOME_SHORTCUTS: { id: string; labelKey: string; icon: IconName }[] = [
  { id: 'tokens', labelKey: 'categories.tokens', icon: 'gift' },
  { id: 'match', labelKey: 'categories.match', icon: 'bolt' },
  { id: 'brandPlus', labelKey: 'categories.brandPlus', icon: 'box' },
  { id: 'clearance', labelKey: 'categories.clearance', icon: 'tag' },
  { id: 'stores', labelKey: 'categories.stores', icon: 'store' },
  { id: 'coupons', labelKey: 'account.coupons', icon: 'coupon' },
];

export const CATEGORIES: Category[] = [
  {
    id: 'automobile',
    name: 'categories.automobile',
    icon: 'truck',
    children: [
      { id: 'auto-acc', name: 'subcategories.autoAcc', image: 'https://picsum.photos/seed/auto1/200' },
      { id: 'auto-parts', name: 'subcategories.autoParts', image: 'https://picsum.photos/seed/auto2/200' },
      { id: 'auto-tools', name: 'subcategories.autoTools', image: 'https://picsum.photos/seed/auto3/200' },
    ],
  },
  {
    id: 'appliances',
    name: 'categories.appliances',
    icon: 'box',
    children: [
      { id: 'app-kitchen', name: 'subcategories.appKitchen', image: 'https://picsum.photos/seed/app1/200' },
      { id: 'app-clean', name: 'subcategories.appClean', image: 'https://picsum.photos/seed/app2/200' },
    ],
  },
  {
    id: 'womensClothing',
    name: 'categories.womensClothing',
    icon: 'tag',
    children: [
      { id: 'w-dress', name: 'subcategories.wDress', image: 'https://picsum.photos/seed/wf1/200' },
      { id: 'w-tops', name: 'subcategories.wTops', image: 'https://picsum.photos/seed/wf2/200' },
      { id: 'w-lingerie', name: 'subcategories.wLingerie', image: 'https://picsum.photos/seed/wf3/200' },
    ],
  },
  {
    id: 'mensClothing',
    name: 'categories.mensClothing',
    icon: 'tag',
    children: [
      { id: 'm-tshirt', name: 'subcategories.mTshirt', image: 'https://picsum.photos/seed/mc1/200' },
      { id: 'm-jean', name: 'subcategories.mJeans', image: 'https://picsum.photos/seed/mc2/200' },
    ],
  },
  { id: 'furniture', name: 'categories.furniture', icon: 'home' },
  { id: 'toys', name: 'categories.toys', icon: 'gift' },
  { id: 'shoes', name: 'categories.shoes', icon: 'tag' },
  { id: 'beauty', name: 'categories.beauty', icon: 'heart' },
  { id: 'jewelry', name: 'categories.jewelry', icon: 'star' },
  { id: 'phones', name: 'categories.phones', icon: 'phone' },
];

export const SUBCATEGORIES: Record<string, string[]> = {
  automobile: ['subcategories.autoAcc', 'subcategories.autoParts', 'subcategories.autoTools', 'subcategories.autoLight', 'subcategories.autoClean', 'subcategories.autoTires'],
  appliances: ['subcategories.appKitchen', 'subcategories.appClean', 'subcategories.appSmall', 'subcategories.appFan', 'subcategories.appCare', 'subcategories.appCoffee'],
  womensClothing: ['subcategories.wDress', 'subcategories.wTops', 'subcategories.wLingerie', 'subcategories.wJeans', 'subcategories.wSkirts', 'subcategories.wJackets'],
  mensClothing: ['subcategories.mTshirt', 'subcategories.mJeans', 'subcategories.mShirts', 'subcategories.mJackets', 'subcategories.mShorts', 'subcategories.mSuits'],
  furniture: ['subcategories.fLiving', 'subcategories.fBedroom', 'subcategories.fOffice', 'subcategories.fStorage', 'subcategories.fDeco', 'subcategories.fGarden'],
  toys: ['subcategories.tEdu', 'subcategories.tFigurines', 'subcategories.tPlush', 'subcategories.tGames', 'subcategories.tPuzzle', 'subcategories.tOutdoor'],
  shoes: ['subcategories.sSneakers', 'subcategories.sSandals', 'subcategories.sBoots', 'subcategories.sCity', 'subcategories.sSport', 'subcategories.sKids'],
  beauty: ['subcategories.bMakeup', 'subcategories.bSkincare', 'subcategories.bHair', 'subcategories.bPerfume', 'subcategories.bNails', 'subcategories.bBody'],
  jewelry: ['subcategories.jNecklaces', 'subcategories.jRings', 'subcategories.jWatches', 'subcategories.jEarrings', 'subcategories.jBracelets', 'subcategories.jBags'],
  phones: ['subcategories.pCases', 'subcategories.pChargers', 'subcategories.pEarphones', 'subcategories.pCables', 'subcategories.pStands', 'subcategories.pScreens'],
};
