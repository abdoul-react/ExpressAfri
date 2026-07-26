export type ProductVariantOption = {
  id: string;
  label: string;
  /** Couleur d'aperçu (hex) ou image. */
  swatch?: string;
  image?: string;
};

export type ProductVariantGroup = {
  /** ex: "color" | "size" */
  key: string;
  /** Label i18n : "color" → product.color */
  labelKey: string;
  options: ProductVariantOption[];
};

export type Product = {
  id: string;
  title: string;
  images: string[];
  /** Prix en USD (référence). Converti à l'affichage. */
  priceUsd: number;
  /** Prix barré en USD (optionnel). */
  originalPriceUsd?: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  categoryId: string;
  /** Boutique d'origine. `null` pour les produits de la boutique système. */
  storeId?: string | null;
  storeName?: string | null;
  /** Réduction en % (calculée ou fournie). */
  discountPercent?: number;
  freeShipping?: boolean;
  isNewBuyerDeal?: boolean;
  isChoice?: boolean;
  badges?: string[];
  variants?: ProductVariantGroup[];
  specs?: { label: string; value: string }[];
  description?: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string; // IconName
  image?: string;
  children?: { id: string; name: string; image?: string }[];
};

export type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  ctaText?: string;
  discountLabel?: string;
  backgroundColor?: string;
  isActive?: boolean;
  position?: number;
};

/** Sélection structurée d'attributs de variante (ex. [{name:"Couleur",value:"Rouge"}]). */
export type VariantAttribute = { name: string; value: string };

export type CartItem = {
  productId: string;
  title: string;
  image: string;
  priceUsd: number;
  quantity: number;
  /** Libellé lisible de la variante (ex. « Rouge · L »), affiché tel quel. */
  variantLabel?: string;
  /** Sélection structurée servant à résoudre la variante exacte côté serveur. */
  variantAttributes?: VariantAttribute[];
  /**
   * Boutique d'origine, figée à l'ajout : le panier doit rester groupable
   * hors ligne, sans réinterroger l'API. Absente des paniers persistés avant
   * l'introduction du champ — l'UI traite alors la provenance comme inconnue.
   */
  storeId?: string | null;
  storeName?: string | null;
  selected: boolean;
};

export type OrderStatus = 'unpaid' | 'toShip' | 'shipped' | 'toReview' | 'returns';

export type FeedPost = {
  id: string;
  image: string;
  title: string;
  author: string;
  authorAvatar?: string;
  likes: number;
  likedByMe?: boolean;
  duration?: string; // "00:19"
  mediaType?: 'image' | 'video';
  videoUrl?: string | null;
  aspectRatio?: number; // hauteur/largeur du média
  linkUrl?: string | null;
  height?: number; // legacy masonry (mock)
};

export type Order = {
  id: string;
  items: Product[];
  status: OrderStatus;
  totalUsd: number;
  shippingUsd: number;
  taxUsd: number;
  createdAt: string;
  address: {
    name: string;
    phone: string;
    street: string;
    city: string;
    country: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
};

export type PaymentMethodId = 'mobileMoney' | 'card' | 'cod' | 'wallet';

export type MessageType = 'text' | 'image' | 'video' | 'pdf' | 'audio';

export type Message = {
  id: string;
  text: string;
  sentByMe: boolean;
  time: string;
  type?: MessageType;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  replyToId?: string | null;
  replyToText?: string | null;
  deleted?: boolean;
};

export type Conversation = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  lastMessage: string;
  lastTime: string;
  unread: number;
  /** Boutique interlocutrice — c'est elle qui titre la conversation. */
  storeId?: string | null;
  storeName?: string | null;
  storeLogo?: string | null;
  /** Identifiant technique de la commande, pour naviguer vers son détail. */
  orderId?: string | null;
  /** Numéro lisible de la commande, affiché au client. */
  orderRef?: string | null;
  orderProduct?: string | null;
  orderImage?: string | null;
  messages: Message[];
};
