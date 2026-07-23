export const MOCK_CUSTOMERS = Array.from({ length: 36 }, (_, i) => ({
  id: `cust_${String(i + 1).padStart(4, '0')}`,
  name: ['Abdou', 'Aminata', 'Ibrahim', 'Fatou', 'Moussa', 'Kadija', 'Oumar', 'Aïcha', 'Seydou', 'Mariam', 'Amadou', 'Rokia'][i % 12],
  email: `${['abdou', 'aminata', 'ibrahim', 'fatou', 'moussa', 'kadija', 'oumar', 'aicha', 'seydou', 'mariam', 'amadou', 'rokia'][i % 12]}${i}@email.com`,
  phone: `+227 ${String(90000000 + i).slice(0, 8)}`,
  city: ['Niamey', 'Maradi', 'Zinder', 'Tahoua', 'Agadez', 'Dosso'][i % 6],
  country: 'Niger',
  totalOrders: Math.floor(Math.random() * 12),
  totalSpent: Math.floor(Math.random() * 500000),
  isBanned: i % 12 === 11,
  createdAt: new Date(2026, 0, 1 + i * 3).toISOString(),
  lastOrderAt: i % 4 === 0 ? new Date(2026, 6, 1 + i).toISOString() : null,
}))
