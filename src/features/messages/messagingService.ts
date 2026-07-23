import type { Conversation, Message } from "@/types";

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "m1",
    name: "GoGo Match",
    avatar: "https://picsum.photos/seed/mm1/80",
    online: true,
    lastMessage: "Merci pour l'info !",
    lastTime: "14:40",
    unread: 0,
    messages: [
      { id: "g1", text: "Nouveau match ! Vous avez 8 likes en attente. Connectez-vous pour découvrir qui vous a liké !", sentByMe: false, time: "14:30" },
      { id: "g2", text: "Super, je vais regarder ça !", sentByMe: true, time: "14:35" },
      { id: "g3", text: "Dépêchez-vous, certains likes expirent dans 24h ⏰", sentByMe: false, time: "14:36" },
      { id: "g4", text: "Merci pour l'info !", sentByMe: true, time: "14:40" },
    ],
  },
  {
    id: "m2",
    name: "Merge Boss",
    avatar: "https://picsum.photos/seed/mm2/80",
    online: true,
    lastMessage: "Parfait, merci !",
    lastTime: "09:25",
    unread: 5,
    messages: [
      { id: "mb1", text: "Votre commande #MB-442 est en cours de préparation.", sentByMe: false, time: "09:15" },
      { id: "mb2", text: "D'accord, quand sera-t-elle expédiée ?", sentByMe: true, time: "09:20" },
      { id: "mb3", text: "L'expédition est prévue pour demain avant 18h.", sentByMe: false, time: "09:21" },
      { id: "mb4", text: "Parfait, merci !", sentByMe: true, time: "09:25" },
    ],
  },
  {
    id: "m3",
    name: "Mode Express",
    avatar: "https://picsum.photos/seed/mm3/80",
    online: false,
    lastMessage: "Oui, notre guide des tailles est disponible…",
    lastTime: "10:17",
    unread: 3,
    messages: [
      { id: "me1", text: "Nouvelle collection été - jusqu'à -50% sur une sélection de robes 👗", sentByMe: false, time: "10:00" },
      { id: "me2", text: "Les tailles sont-elles fidèles ?", sentByMe: true, time: "10:15" },
      { id: "me3", text: "Oui, notre guide des tailles est disponible sur chaque fiche produit. N'hésitez pas à le consulter !", sentByMe: false, time: "10:17" },
    ],
  },
  {
    id: "m4",
    name: "TechStore SN",
    avatar: "https://picsum.photos/seed/mm4/80",
    online: true,
    lastMessage: "Merci pour votre réactivité !",
    lastTime: "08:10",
    unread: 0,
    messages: [
      { id: "ts1", text: "Votre réclamation #TS-891 a été traitée. Un remboursement de 25 000 FCFA a été initié.", sentByMe: false, time: "08:00" },
      { id: "ts2", text: "Super, sous combien de jours vais-je recevoir le remboursement ?", sentByMe: true, time: "08:05" },
      { id: "ts3", text: "Sous 3 à 5 jours ouvrés sur votre moyen de paiement initial.", sentByMe: false, time: "08:06" },
      { id: "ts4", text: "Merci pour votre réactivité !", sentByMe: true, time: "08:10" },
    ],
  },
  {
    id: "m5",
    name: "Service Client",
    avatar: "https://picsum.photos/seed/mm5/80",
    online: true,
    lastMessage: "Vérifiez que votre panier contient des articles éligibles.",
    lastTime: "Lun",
    unread: 1,
    messages: [
      { id: "sc1", text: "Bonjour, comment pouvons-nous vous aider ?", sentByMe: false, time: "Lun" },
      { id: "sc2", text: "Bonjour, je n'arrive pas à appliquer un code promo sur ma commande.", sentByMe: true, time: "Lun" },
      { id: "sc3", text: "Je vérifie cela pour vous. Pouvez-vous me communiquer le code ?", sentByMe: false, time: "Lun" },
      { id: "sc4", text: "Le code c'est ETE2026", sentByMe: true, time: "Lun" },
      { id: "sc5", text: "Merci. Ce code est valable uniquement sur les articles en soldes. Vérifiez que votre panier contient des articles éligibles.", sentByMe: false, time: "Lun" },
    ],
  },
  {
    id: "m6",
    name: "AfriMarket",
    avatar: "https://picsum.photos/seed/mm6/80",
    online: false,
    lastMessage: "Oui, tous les appareils de cuisine sont inclus.",
    lastTime: "11:06",
    unread: 2,
    messages: [
      { id: "am1", text: "Promo flash : -30% sur l'électromagnéner ⚡ Valable encore 4h !", sentByMe: false, time: "11:00" },
      { id: "am2", text: "Intéressant ! Est-ce que ça inclut les réfrigérateurs ?", sentByMe: true, time: "11:05" },
      { id: "am3", text: "Oui, tous les appareils de cuisine sont inclus. Dépêchez-vous 😊", sentByMe: false, time: "11:06" },
    ],
  },
  {
    id: "m7",
    name: "Vendeur · BoutiqueMode",
    avatar: "https://picsum.photos/seed/mm7/80",
    online: true,
    lastMessage: "Merci beaucoup !",
    lastTime: "15:15",
    unread: 0,
    orderRef: "BM-789",
    orderProduct: "Robe d'été fleurie",
    orderImage: "https://picsum.photos/seed/dress1/200",
    messages: [
      { id: "bm1", text: "Votre article « Robe d'été » a été expédié 🚚", sentByMe: false, time: "15:00" },
      { id: "bm2", text: "Super ! Pouvez-vous me donner le numéro de suivi ?", sentByMe: true, time: "15:10" },
      { id: "bm3", text: "Bien sûr, le numéro est : SN789-EXPRESS-001. Livraison prévue sous 5 à 7 jours.", sentByMe: false, time: "15:12" },
      { id: "bm4", text: "Merci beaucoup !", sentByMe: true, time: "15:15" },
    ],
  },
];

function buildSellerConversation(orderId: string): Conversation {
  const id = "seller-" + orderId;
  return {
    id,
    name: "Vendeur · ExpressShop",
    avatar: "https://picsum.photos/seed/seller1/80",
    online: true,
    lastMessage: "Bonjour, comment puis-je vous aider ?",
    lastTime: "À l'instant",
    unread: 0,
    orderRef: orderId.toUpperCase(),
    orderProduct: "Article de votre commande",
    orderImage: "https://picsum.photos/seed/order/200",
    messages: [
      { id: `${id}-s1`, text: `Bonjour, je suis le vendeur associé à la commande #${orderId.toUpperCase()}. Comment puis-je vous aider ?`, sentByMe: false, time: "10:00" },
      { id: `${id}-s2`, text: "Bonjour, je souhaiterais avoir des informations sur le suivi de ma commande.", sentByMe: true, time: "10:05" },
      { id: `${id}-s3`, text: "Votre colis a été expédié et est actuellement en transit. Le numéro de suivi est EXPR-123-456.", sentByMe: false, time: "10:06" },
      { id: `${id}-s4`, text: "D'accord, merci pour l'information !", sentByMe: true, time: "10:10" },
    ],
  };
}

export const messagingService = {
  getConversations(): Conversation[] {
    return MOCK_CONVERSATIONS;
  },

  getConversationById(id: string): Conversation | undefined {
    const found = MOCK_CONVERSATIONS.find((c) => c.id === id);
    if (found) return found;

    if (id.startsWith("seller-")) {
      const orderId = id.replace("seller-", "");
      return buildSellerConversation(orderId);
    }

    return undefined;
  },
};
