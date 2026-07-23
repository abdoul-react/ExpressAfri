import type { LoyaltyRule, LoyaltyReward, CustomerPoints, PointsTransaction } from '../../AdminLoyaltyDataSource'

export const MOCK_LOYALTY_RULES: LoyaltyRule[] = [
  { id: 'rule_001', name: '1 point par 100 FCFA', type: 'earn_per_spend', points: 1, condition: 'Pour chaque tranche de 100 FCFA dépensés', isActive: true, createdAt: new Date(2026, 0, 1).toISOString(), updatedAt: new Date(2026, 5, 15).toISOString() },
  { id: 'rule_002', name: 'Bonus inscription 500 pts', type: 'signup_bonus', points: 500, condition: 'À l\'inscription du client', isActive: true, createdAt: new Date(2026, 0, 1).toISOString(), updatedAt: new Date(2026, 5, 1).toISOString() },
  { id: 'rule_003', name: 'Parrainage 200 pts', type: 'referral_bonus', points: 200, condition: 'Quand un filleul passe sa première commande', isActive: true, createdAt: new Date(2026, 1, 1).toISOString(), updatedAt: new Date(2026, 4, 10).toISOString() },
  { id: 'rule_004', name: 'Anniversaire 100 pts', type: 'birthday_bonus', points: 100, condition: 'Le jour de l\'anniversaire du client', isActive: false, createdAt: new Date(2026, 2, 1).toISOString(), updatedAt: new Date(2026, 6, 1).toISOString() },
  { id: 'rule_005', name: 'Avis produit 50 pts', type: 'review_bonus', points: 50, condition: 'Par avis publié et approuvé', isActive: true, createdAt: new Date(2026, 3, 1).toISOString(), updatedAt: new Date(2026, 6, 10).toISOString() },
]

export const MOCK_LOYALTY_REWARDS: LoyaltyReward[] = [
  { id: 'rew_001', name: '-10% sur prochaine commande', description: 'Réduction de 10% valable sur tout le catalogue', pointsCost: 500, type: 'discount', value: 10, isActive: true, stock: 100, createdAt: new Date(2026, 0, 15).toISOString(), updatedAt: new Date(2026, 6, 5).toISOString() },
  { id: 'rew_002', name: 'Livraison gratuite', description: 'Frais de livraison offerts pour votre prochaine commande', pointsCost: 300, type: 'free_shipping', value: 0, isActive: true, stock: 200, createdAt: new Date(2026, 1, 1).toISOString(), updatedAt: new Date(2026, 5, 20).toISOString() },
  { id: 'rew_003', name: '-25% sur une sélection', description: 'Réduction de 25% sur les articles sélectionnés', pointsCost: 1000, type: 'discount', value: 25, isActive: true, stock: 50, createdAt: new Date(2026, 2, 1).toISOString(), updatedAt: new Date(2026, 6, 1).toISOString() },
  { id: 'rew_004', name: 'Bon d\'achat 5000 FCFA', description: 'Bon d\'achat d\'une valeur de 5 000 FCFA', pointsCost: 2000, type: 'voucher', value: 5000, isActive: true, stock: 30, createdAt: new Date(2026, 3, 1).toISOString(), updatedAt: new Date(2026, 6, 10).toISOString() },
  { id: 'rew_005', name: 'Produit surprise gratuit', description: 'Un produit surprise de notre sélection cadeaux', pointsCost: 1500, type: 'free_product', value: 0, isActive: false, stock: 0, createdAt: new Date(2026, 4, 1).toISOString(), updatedAt: new Date(2026, 6, 1).toISOString() },
]

export const MOCK_CUSTOMER_POINTS: CustomerPoints[] = [
  { customerId: 'cust_0001', customerName: 'Abdou', customerEmail: 'abdou@email.com', points: 1250, lifetimePoints: 3200, tier: 'gold', lastActivity: new Date(2026, 6, 15).toISOString() },
  { customerId: 'cust_0002', customerName: 'Aminata', customerEmail: 'aminata@email.com', points: 780, lifetimePoints: 1500, tier: 'silver', lastActivity: new Date(2026, 6, 14).toISOString() },
  { customerId: 'cust_0003', customerName: 'Ibrahim', customerEmail: 'ibrahim@email.com', points: 320, lifetimePoints: 800, tier: 'bronze', lastActivity: new Date(2026, 6, 10).toISOString() },
  { customerId: 'cust_0004', customerName: 'Fatou', customerEmail: 'fatou@email.com', points: 5000, lifetimePoints: 12000, tier: 'platinum', lastActivity: new Date(2026, 6, 15).toISOString() },
  { customerId: 'cust_0005', customerName: 'Moussa', customerEmail: 'moussa@email.com', points: 0, lifetimePoints: 200, tier: 'bronze', lastActivity: new Date(2026, 5, 20).toISOString() },
  { customerId: 'cust_0006', customerName: 'Kadija', customerEmail: 'kadija@email.com', points: 2100, lifetimePoints: 4500, tier: 'gold', lastActivity: new Date(2026, 6, 13).toISOString() },
  { customerId: 'cust_0007', customerName: 'Oumar', customerEmail: 'oumar@email.com', points: 450, lifetimePoints: 450, tier: 'bronze', lastActivity: new Date(2026, 6, 1).toISOString() },
  { customerId: 'cust_0008', customerName: 'Aïcha', customerEmail: 'aicha@email.com', points: 1500, lifetimePoints: 2800, tier: 'silver', lastActivity: new Date(2026, 6, 12).toISOString() },
]

export const MOCK_TRANSACTIONS: PointsTransaction[] = [
  { id: 'txn_001', customerId: 'cust_0001', customerName: 'Abdou', type: 'earned', points: 500, description: 'Bonus inscription', createdAt: new Date(2026, 0, 10).toISOString() },
  { id: 'txn_002', customerId: 'cust_0001', customerName: 'Abdou', type: 'earned', points: 150, description: 'Commande #ORD-0001', createdAt: new Date(2026, 2, 15).toISOString() },
  { id: 'txn_003', customerId: 'cust_0001', customerName: 'Abdou', type: 'spent', points: -300, description: 'Livraison gratuite', createdAt: new Date(2026, 3, 1).toISOString() },
  { id: 'txn_004', customerId: 'cust_0001', customerName: 'Abdou', type: 'earned', points: 600, description: 'Commande #ORD-0005', createdAt: new Date(2026, 5, 10).toISOString() },
  { id: 'txn_005', customerId: 'cust_0001', customerName: 'Abdou', type: 'adjusted', points: 300, description: 'Ajustement admin : geste commercial', createdAt: new Date(2026, 6, 1).toISOString() },
  { id: 'txn_006', customerId: 'cust_0004', customerName: 'Fatou', type: 'earned', points: 500, description: 'Bonus inscription', createdAt: new Date(2026, 0, 5).toISOString() },
  { id: 'txn_007', customerId: 'cust_0004', customerName: 'Fatou', type: 'earned', points: 3000, description: 'Commandes cumulées (x6)', createdAt: new Date(2026, 4, 20).toISOString() },
  { id: 'txn_008', customerId: 'cust_0004', customerName: 'Fatou', type: 'spent', points: -1000, description: 'Bon d\'achat 5 000 FCFA', createdAt: new Date(2026, 6, 10).toISOString() },
  { id: 'txn_009', customerId: 'cust_0006', customerName: 'Kadija', type: 'earned', points: 500, description: 'Bonus inscription', createdAt: new Date(2026, 1, 20).toISOString() },
  { id: 'txn_010', customerId: 'cust_0006', customerName: 'Kadija', type: 'earned', points: 200, description: 'Parrainage - Aminata', createdAt: new Date(2026, 3, 5).toISOString() },
  { id: 'txn_011', customerId: 'cust_0002', customerName: 'Aminata', type: 'earned', points: 500, description: 'Bonus inscription', createdAt: new Date(2026, 3, 5).toISOString() },
  { id: 'txn_012', customerId: 'cust_0002', customerName: 'Aminata', type: 'earned', points: 100, description: 'Avis produit - T-shirt Niger', createdAt: new Date(2026, 5, 10).toISOString() },
]
