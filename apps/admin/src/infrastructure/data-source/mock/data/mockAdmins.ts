import type { AdminUser } from '@/types/AdminUser'

export const MOCK_ADMINS: AdminUser[] = [
  {
    id: 'admin_001',
    email: 'super@expressafri.com',
    name: 'Abdou Super Admin',
    role: 'super_admin',
    permissions: '*',
    isSuperAdmin: true,
  },
  {
    id: 'admin_002',
    email: 'products@expressafri.com',
    name: 'Aminata Product Manager',
    role: 'product_admin',
    permissions: [
      'products.read', 'products.create', 'products.update',
      'products.delete', 'products.export',
      'categories.read', 'categories.create', 'categories.update',
      'categories.delete',
      'stores.read', 'stores.update', 'stores.approve',
    ],
    isSuperAdmin: false,
  },
  {
    id: 'admin_003',
    email: 'orders@expressafri.com',
    name: 'Ibrahim Order Manager',
    role: 'order_admin',
    permissions: [
      'orders.read', 'orders.update', 'orders.cancel',
      'orders.refund', 'orders.export',
      'payments.read', 'payments.update', 'payments.refund',
      'users.read',
    ],
    isSuperAdmin: false,
  },
  {
    id: 'admin_004',
    email: 'content@expressafri.com',
    name: 'Fatou Content Manager',
    role: 'content_admin',
    permissions: [
      'content.read', 'content.create', 'content.update', 'content.delete',
      'promotions.read', 'promotions.create', 'promotions.update',
      'promotions.delete',
      'coupons.read', 'coupons.create', 'coupons.update', 'coupons.delete',
    ],
    isSuperAdmin: false,
  },
  {
    id: 'admin_005',
    email: 'support@expressafri.com',
    name: 'Moussa Support Agent',
    role: 'support_admin',
    permissions: [
      'users.read', 'users.update',
      'orders.read',
      'messages.read', 'messages.update',
      'reports.read', 'reports.update',
    ],
    isSuperAdmin: false,
  },
  {
    id: 'admin_006',
    email: 'marketing@expressafri.com',
    name: 'Kadija Marketing Lead',
    role: 'marketing_admin',
    permissions: [
      'campaigns.read', 'campaigns.create', 'campaigns.update',
      'campaigns.delete',
      'promotions.read', 'promotions.create', 'promotions.update',
      'coupons.read', 'coupons.create', 'coupons.update',
      'affiliates.read', 'affiliates.create', 'affiliates.update',
      'commissions.read', 'commissions.approve',
      'analytics.read',
    ],
    isSuperAdmin: false,
  },
]

export const MOCK_CREDENTIALS: Record<string, { password: string; adminId: string }> = {
  'super@expressafri.com': { password: 'super123', adminId: 'admin_001' },
  'products@expressafri.com': { password: 'products123', adminId: 'admin_002' },
  'orders@expressafri.com': { password: 'orders123', adminId: 'admin_003' },
  'content@expressafri.com': { password: 'content123', adminId: 'admin_004' },
  'support@expressafri.com': { password: 'support123', adminId: 'admin_005' },
  'marketing@expressafri.com': { password: 'marketing123', adminId: 'admin_006' },
}
