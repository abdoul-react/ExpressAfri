export const MOCK_ORDERS = Array.from({ length: 24 }, (_, i) => ({
  id: `ord_${String(i + 1).padStart(4, '0')}`,
  customerId: `cust_${String((i % 8) + 1).padStart(4, '0')}`,
  customerName: ['Abdou', 'Aminata', 'Ibrahim', 'Fatou', 'Moussa', 'Kadija', 'Oumar', 'Aïcha'][i % 8],
  customerEmail: `${['abdou', 'aminata', 'ibrahim', 'fatou', 'moussa', 'kadija', 'oumar', 'aicha'][i % 8]}@email.com`,
  items: [
    { productId: `prod_${String((i % 12) + 1).padStart(4, '0')}`, quantity: 1, price: [15000, 45000, 25000][i % 3] },
  ],
  total: [15000, 45000, 25000, 65000, 35000, 8500][i % 6],
  status: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'][i % 6],
  paymentStatus: ['pending', 'paid', 'refunded'][i % 3],
  paymentMethod: ['Orange Money', 'Wave', 'Carte Visa', 'Mobile Money'][i % 4],
  shippingAddress: {
    street: '123 Rue du Marché',
    city: 'Niamey',
    region: 'Niamey',
    country: 'Niger',
  },
  createdAt: new Date(2026, 6, 1 + i).toISOString(),
  updatedAt: new Date(2026, 6, 1 + Math.floor(i / 2)).toISOString(),
}))
