import type { MessageItem } from '../../AdminMessageDataSource'

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

export const MOCK_MESSAGES: MessageItem[] = [
  { id: 'msg_001', conversationId: 'conv_001', customerId: 'cust_001', customerName: 'Aminata Diallo', customerEmail: 'aminata.d@email.com', subject: 'Commande non reçue', lastMessage: 'Bonjour, ma commande #ORD-1234 devait être livrée hier et je n\'ai toujours rien reçu...', status: 'open', priority: 'high', unread: true, messageCount: 3, createdAt: ago(2), updatedAt: ago(0.5) },
  { id: 'msg_002', conversationId: 'conv_002', customerId: 'cust_005', customerName: 'Mamadou Touré', customerEmail: 'mamadou.t@email.com', subject: 'Demande de remboursement', lastMessage: 'J\'ai retourné le colis la semaine dernière, quand vais-je être remboursé ?', status: 'in_progress', priority: 'medium', assignedTo: 'admin_005', assignedToName: 'Moussa Support Agent', unread: false, messageCount: 5, createdAt: ago(24), updatedAt: ago(3) },
  { id: 'msg_003', conversationId: 'conv_003', customerId: 'cust_012', customerName: 'Fatou Bintou', customerEmail: 'fatou.b@email.com', subject: 'Information sur un produit', lastMessage: 'Le T-shirt Niger est-il disponible en taille XL ?', status: 'resolved', priority: 'low', assignedTo: 'admin_005', assignedToName: 'Moussa Support Agent', unread: false, messageCount: 2, createdAt: ago(48), updatedAt: ago(40) },
  { id: 'msg_004', conversationId: 'conv_004', customerId: 'cust_008', customerName: 'Ibrahim Koné', customerEmail: 'ibrahim.k@email.com', subject: 'Problème de livraison', lastMessage: 'Le livreur est passé mais je n\'étais pas là, comment reprogrammer ?', status: 'open', priority: 'medium', unread: true, messageCount: 1, createdAt: ago(1), updatedAt: ago(1) },
  { id: 'msg_005', conversationId: 'conv_005', customerId: 'cust_015', customerName: 'Kadija Sow', customerEmail: 'kadija.s@email.com', subject: 'Compte bloqué', lastMessage: 'Je n\'arrive plus à me connecter à mon compte depuis hier.', status: 'in_progress', priority: 'high', assignedTo: 'admin_001', assignedToName: 'Abdou Super Admin', unread: true, messageCount: 4, createdAt: ago(5), updatedAt: ago(1) },
  { id: 'msg_006', conversationId: 'conv_006', customerId: 'cust_003', customerName: 'Ousmane Ndiaye', customerEmail: 'ousmane.n@email.com', subject: 'Réclamation article abîmé', lastMessage: 'J\'ai reçu mon colis mais le vase est cassé. Je joins les photos.', status: 'open', priority: 'high', unread: true, messageCount: 2, createdAt: ago(3), updatedAt: ago(2.5) },
  { id: 'msg_007', conversationId: 'conv_007', customerId: 'cust_020', customerName: 'Aïcha Camara', customerEmail: 'aicha.c@email.com', subject: 'Changement d\'adresse', lastMessage: 'Je dois changer l\'adresse de livraison de ma commande #ORD-1245.', status: 'resolved', priority: 'low', assignedTo: 'admin_005', assignedToName: 'Moussa Support Agent', unread: false, messageCount: 3, createdAt: ago(72), updatedAt: ago(60) },
  { id: 'msg_008', conversationId: 'conv_008', customerId: 'cust_022', customerName: 'Bakary Traoré', customerEmail: 'bakary.t@email.com', subject: 'Question avant achat', lastMessage: 'Est-ce que vous livrez à Bamako ? Quels sont les délais ?', status: 'open', priority: 'low', unread: false, messageCount: 1, createdAt: ago(4), updatedAt: ago(4) },
  { id: 'msg_009', conversationId: 'conv_009', customerId: 'cust_001', customerName: 'Aminata Diallo', customerEmail: 'aminata.d@email.com', subject: 'Réclamation précédente', lastMessage: 'Suite à notre échange, je n\'ai toujours pas de nouvelle.', status: 'closed', priority: 'medium', assignedTo: 'admin_005', assignedToName: 'Moussa Support Agent', unread: false, messageCount: 8, createdAt: ago(120), updatedAt: ago(96) },
  { id: 'msg_010', conversationId: 'conv_010', customerId: 'cust_010', customerName: 'Seydou Fall', customerEmail: 'seydou.f@email.com', subject: 'Code promo ne fonctionne pas', lastMessage: 'Le code WELCOME20 ne fonctionne pas sur mon panier.', status: 'in_progress', priority: 'medium', assignedTo: 'admin_004', assignedToName: 'Fatou Content Manager', unread: false, messageCount: 3, createdAt: ago(10), updatedAt: ago(6) },
  { id: 'msg_011', conversationId: 'conv_011', customerId: 'cust_030', customerName: 'Rokia Diarra', customerEmail: 'rokia.d@email.com', subject: 'Demande partenariat', lastMessage: 'Je suis intéressée par un partenariat avec ExpressAfri pour ma boutique.', status: 'open', priority: 'low', unread: true, messageCount: 1, createdAt: ago(8), updatedAt: ago(8) },
  { id: 'msg_012', conversationId: 'conv_012', customerId: 'cust_018', customerName: 'Modibo Keita', customerEmail: 'modibo.k@email.com', subject: 'Paiement non validé', lastMessage: 'J\'ai effectué le paiement par carte mais ma commande est toujours en attente.', status: 'open', priority: 'high', unread: true, messageCount: 2, createdAt: ago(0.5), updatedAt: ago(0.3) },
]

export const MOCK_MESSAGE_DETAILS: Record<string, any> = {
  conv_001: {
    id: 'msg_001',
    conversationId: 'conv_001',
    customerId: 'cust_001',
    customerName: 'Aminata Diallo',
    customerEmail: 'aminata.d@email.com',
    subject: 'Commande non reçue',
    status: 'open',
    priority: 'high',
    messages: [
      { id: 'm_001', senderId: 'cust_001', senderName: 'Aminata Diallo', senderType: 'customer' as const, content: 'Bonjour, ma commande #ORD-1234 devait être livrée hier et je n\'ai toujours rien reçu. Pouvez-vous vérifier ?', createdAt: ago(3) },
      { id: 'm_002', senderId: 'admin_005', senderName: 'Moussa Support Agent', senderType: 'admin' as const, content: 'Bonjour Aminata, je vérifie immédiatement le statut de votre commande. Pouvez-vous me confirmer votre adresse de livraison ?', createdAt: ago(2.5) },
      { id: 'm_003', senderId: 'cust_001', senderName: 'Aminata Diallo', senderType: 'customer' as const, content: 'Oui, c\'est au 123 Rue des Abidjanais, Cocody. Le suivi indique "livré" mais je n\'ai rien reçu.', createdAt: ago(0.5) },
    ],
    createdAt: ago(3),
    updatedAt: ago(0.5),
  },
}
