import type { AnalyticsData } from '../../AdminAnalyticsDataSource'

function subDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() - n); return r }
function fmt(d: Date) { return d.toISOString().split('T')[0] }

const today = new Date()
const days30 = Array.from({ length: 30 }, (_, i) => {
  const d = subDays(today, 29 - i)
  return { date: fmt(d), value: Math.round(500000 + Math.random() * 2000000 + (i * 30000)), label: fmt(d).slice(5) }
})
const days7 = days30.slice(-7)
const months12 = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(today.getFullYear(), i, 1)
  return { date: fmt(d), value: Math.round(5000000 + Math.random() * 15000000 + (i * 500000)), label: d.toLocaleDateString('fr-FR', { month: 'short' }) }
})

export const MOCK_ANALYTICS_DATA: AnalyticsData = {
  summary: {
    periodStart: fmt(subDays(today, 29)),
    periodEnd: fmt(today),
    revenue: { total: 456000000, growth: 23.5 },
    orders: { total: 12450, growth: 18.2, averageValue: 36600 },
    customers: { total: 89200, new: 3450, growth: 15.8 },
    products: { total: 48000, sold: 32400 },
    stores: { total: 1200, active: 890 },
    conversionRate: 3.2,
    averageOrderValue: 36600,
  },
  revenueChart: days30,
  ordersChart: days30.map((d) => ({ ...d, value: Math.round(200 + Math.random() * 600 + (d.value % 100)) })),
  customerChart: days30.map((d) => ({ ...d, value: Math.round(50 + Math.random() * 200 + (d.value % 50)) })),
  topProducts: [
    { id: 'prod_001', name: 'T-shirt Niger', value: 12500000, count: 850, growth: 12.3 },
    { id: 'prod_002', name: 'Sac à main Afrique', value: 9800000, count: 420, growth: 8.7 },
    { id: 'prod_003', name: 'Montre Connectée Pro', value: 8750000, count: 290, growth: 34.2 },
    { id: 'prod_004', name: 'Casque Audio Bluetooth', value: 7200000, count: 560, growth: -2.1 },
    { id: 'prod_005', name: 'Écouteurs Sans Fil', value: 6500000, count: 890, growth: 45.6 },
    { id: 'prod_006', name: 'Chemise Africaine', value: 5400000, count: 340, growth: 5.4 },
    { id: 'prod_007', name: 'Parfum Importé', value: 4800000, count: 280, growth: 18.9 },
    { id: 'prod_008', name: 'Sac à Dos Urbain', value: 3900000, count: 410, growth: -5.3 },
  ],
  topCategories: [
    { id: 'cat_001', name: 'Électronique', value: 185000000, count: 4250, growth: 15.2 },
    { id: 'cat_005', name: 'Mode & Vêtements', value: 125000000, count: 3820, growth: 22.8 },
    { id: 'cat_003', name: 'Beauté & Bien-être', value: 68000000, count: 2100, growth: 31.5 },
    { id: 'cat_002', name: 'Maison & Cuisine', value: 45000000, count: 1560, growth: 8.3 },
    { id: 'cat_007', name: 'Sports & Loisirs', value: 32000000, count: 980, growth: -1.2 },
  ],
  topStores: [
    { id: 'store_001', name: 'TechWorld CI', value: 98000000, count: 3200, growth: 18.5 },
    { id: 'store_003', name: 'AfroStyle', value: 72000000, count: 2800, growth: 25.3 },
    { id: 'store_002', name: 'ModeAfrique', value: 54000000, count: 1900, growth: 12.8 },
    { id: 'store_005', name: 'GadgetPro', value: 38000000, count: 1450, growth: 35.6 },
    { id: 'store_006', name: 'BeautyShop', value: 25000000, count: 1100, growth: 42.1 },
  ],
  revenueByPayment: [
    { paymentMethod: 'Wave', amount: 156000000, percentage: 34.2, count: 4250 },
    { paymentMethod: 'Orange Money', amount: 98000000, percentage: 21.5, count: 2800 },
    { paymentMethod: 'Carte Visa', amount: 75000000, percentage: 16.4, count: 1850 },
    { paymentMethod: 'MTN Mobile Money', amount: 52000000, percentage: 11.4, count: 1500 },
    { paymentMethod: 'Mastercard', amount: 38000000, percentage: 8.3, count: 950 },
    { paymentMethod: 'Paiement livraison', amount: 25000000, percentage: 5.5, count: 800 },
    { paymentMethod: 'ExpressAfri Wallet', amount: 12000000, percentage: 2.7, count: 300 },
  ],
  geographicData: [
    { country: "Côte d'Ivoire", code: 'CI', orders: 4250, revenue: 145000000, customers: 28500 },
    { country: 'Sénégal', code: 'SN', orders: 2100, revenue: 78000000, customers: 15200 },
    { country: 'Cameroun', code: 'CM', orders: 1850, revenue: 62000000, customers: 12800 },
    { country: 'Mali', code: 'ML', orders: 1200, revenue: 38000000, customers: 8900 },
    { country: 'Burkina Faso', code: 'BF', orders: 980, revenue: 32000000, customers: 7200 },
    { country: 'Niger', code: 'NE', orders: 750, revenue: 24000000, customers: 5400 },
    { country: 'Togo', code: 'TG', orders: 520, revenue: 18000000, customers: 3800 },
    { country: 'Bénin', code: 'BJ', orders: 480, revenue: 15000000, customers: 3200 },
    { country: 'Ghana', code: 'GH', orders: 320, revenue: 12000000, customers: 2200 },
    { country: 'Nigeria', code: 'NG', orders: 280, revenue: 9500000, customers: 1800 },
  ],
}
