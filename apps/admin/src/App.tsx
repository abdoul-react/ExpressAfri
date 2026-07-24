import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AdminAuthProvider } from '@/features/auth'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { TooltipProvider } from '@/components/ui'
import { ProtectedRoute } from '@/components/guards/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoadingBlock } from '@/components/ui/Spinner'

function lazyPage(importFn: () => Promise<Record<string, any>>, name: string) {
  const Comp = lazy(() => importFn().then((m) => ({ default: m[name] })))
  return (props: any) => (
    <Suspense fallback={<LoadingBlock />}>
      <Comp {...props} />
    </Suspense>
  )
}

const DashboardPage = lazyPage(() => import('@/features/dashboard'), 'DashboardPage')
const AdminProductListPage = lazyPage(() => import('@/features/products/pages/AdminProductListPage'), 'AdminProductListPage')
const AdminProductFormPage = lazyPage(() => import('@/features/products/pages/AdminProductFormPage'), 'AdminProductFormPage')
const AdminProductModerationPage = lazyPage(() => import('@/features/products/pages/AdminProductModerationPage'), 'AdminProductModerationPage')
const AdminProductImportPage = lazyPage(() => import('@/features/products/pages/AdminProductImportPage'), 'AdminProductImportPage')
const AdminCategoryListPage = lazyPage(() => import('@/features/categories/pages/AdminCategoryListPage'), 'AdminCategoryListPage')
const AdminStoreListPage = lazyPage(() => import('@/features/stores/pages/AdminStoreListPage'), 'AdminStoreListPage')
const AdminStoreDetailPage = lazyPage(() => import('@/features/stores/pages/AdminStoreDetailPage'), 'AdminStoreDetailPage')
const AdminOrderListPage = lazyPage(() => import('@/features/orders/pages/AdminOrderListPage'), 'AdminOrderListPage')
const AdminOrderDetailPage = lazyPage(() => import('@/features/orders/pages/AdminOrderDetailPage'), 'AdminOrderDetailPage')
const AdminPaymentListPage = lazyPage(() => import('@/features/payments/pages/AdminPaymentListPage'), 'AdminPaymentListPage')
const AdminPaymentDetailPage = lazyPage(() => import('@/features/payments/pages/AdminPaymentDetailPage'), 'AdminPaymentDetailPage')
const AdminReceiptListPage = lazyPage(() => import('@/features/receipts/pages/AdminReceiptListPage'), 'AdminReceiptListPage')
const AdminReceiptSettingsPage = lazyPage(() => import('@/features/receipts/pages/AdminReceiptSettingsPage'), 'AdminReceiptSettingsPage')
const AdminCustomerListPage = lazyPage(() => import('@/features/customers/pages/AdminCustomerListPage'), 'AdminCustomerListPage')
const AdminCustomerDetailPage = lazyPage(() => import('@/features/customers/pages/AdminCustomerDetailPage'), 'AdminCustomerDetailPage')
const AdminContentPage = lazyPage(() => import('@/features/content'), 'AdminContentPage')
const AdminReviewsPage = lazyPage(() => import('@/features/content/pages/AdminReviewsPage'), 'AdminReviewsPage')
const AdminCouponListPage = lazyPage(() => import('@/features/coupons/pages/AdminCouponListPage'), 'AdminCouponListPage')
const AdminCouponFormPage = lazyPage(() => import('@/features/coupons/pages/AdminCouponFormPage'), 'AdminCouponFormPage')
const AdminCampaignListPage = lazyPage(() => import('@/features/campaigns/pages/AdminCampaignListPage'), 'AdminCampaignListPage')
const AdminCampaignFormPage = lazyPage(() => import('@/features/campaigns/pages/AdminCampaignFormPage'), 'AdminCampaignFormPage')
const AdminCampaignDetailPage = lazyPage(() => import('@/features/campaigns/pages/AdminCampaignDetailPage'), 'AdminCampaignDetailPage')
const AdminAnalyticsPage = lazyPage(() => import('@/features/analytics/pages/AdminAnalyticsPage'), 'AdminAnalyticsPage')
const AdminAdminListPage = lazyPage(() => import('@/features/admins/pages/AdminAdminListPage'), 'AdminAdminListPage')
const AdminRoleListPage = lazyPage(() => import('@/features/roles/pages/AdminRoleListPage'), 'AdminRoleListPage')
const AdminAuditPage = lazyPage(() => import('@/features/audit/pages/AdminAuditPage'), 'AdminAuditPage')
const AdminSettingsPage = lazyPage(() => import('@/features/settings/pages/AdminSettingsPage'), 'AdminSettingsPage')
const AdminFeaturesPage = lazyPage(() => import('@/features/features/pages/AdminFeaturesPage'), 'AdminFeaturesPage')
const AdminMessageListPage = lazyPage(() => import('@/features/messages/pages/AdminMessageListPage'), 'AdminMessageListPage')
const AdminShippingPage = lazyPage(() => import('@/features/shipping/pages/AdminShippingPage'), 'AdminShippingPage')
const AdminDeliveryListPage = lazyPage(() => import('@/features/delivery/pages/AdminDeliveryListPage'), 'AdminDeliveryListPage')
const AdminDeliveryAssignmentsPage = lazyPage(() => import('@/features/delivery/pages/AdminDeliveryAssignmentsPage'), 'AdminDeliveryAssignmentsPage')
const AdminDeliveryDetailPage = lazyPage(() => import('@/features/delivery/pages/AdminDeliveryDetailPage'), 'AdminDeliveryDetailPage')
const AdminPayoutListPage = lazyPage(() => import('@/features/payouts/pages/AdminPayoutListPage'), 'AdminPayoutListPage')
const AdminReturnListPage = lazyPage(() => import('@/features/returns/pages/AdminReturnListPage'), 'AdminReturnListPage')
const AdminNotificationPage = lazyPage(() => import('@/features/notifications/pages/AdminNotificationPage'), 'AdminNotificationPage')
const AdminLoyaltyPage = lazyPage(() => import('@/features/loyalty/pages/AdminLoyaltyPage'), 'AdminLoyaltyPage')
const AdminAffiliatePage = lazyPage(() => import('@/features/affiliates/pages/AdminAffiliatePage'), 'AdminAffiliatePage')
const AdminReportListPage = lazyPage(() => import('@/features/reports/pages/AdminReportListPage'), 'AdminReportListPage')
const AdminDisputeListPage = lazyPage(() => import('@/features/disputes/pages/AdminDisputeListPage'), 'AdminDisputeListPage')
const AdminDisputeDetailPage = lazyPage(() => import('@/features/disputes/pages/AdminDisputeDetailPage'), 'AdminDisputeDetailPage')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster richColors position="top-right" theme={theme} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
        <TooltipProvider delayDuration={300}>
        <AdminAuthProvider>
          <ThemedToaster />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />

              <Route path="products" element={
                <ProtectedRoute requiredPermissions={['products.read']}>
                  <AdminProductListPage />
                </ProtectedRoute>
              } />
              <Route path="products/new" element={
                <ProtectedRoute requiredPermissions={['products.create']}>
                  <AdminProductFormPage />
                </ProtectedRoute>
              } />
              <Route path="products/:id" element={
                <ProtectedRoute requiredPermissions={['products.read']}>
                  <AdminProductFormPage />
                </ProtectedRoute>
              } />
              <Route path="products/:id/edit" element={
                <ProtectedRoute requiredPermissions={['products.update']}>
                  <AdminProductFormPage />
                </ProtectedRoute>
              } />
              <Route path="products/moderation" element={
                <ProtectedRoute requiredPermissions={['products.update']}>
                  <AdminProductModerationPage />
                </ProtectedRoute>
              } />
              <Route path="products/import" element={
                <ProtectedRoute requiredPermissions={['products.create']}>
                  <AdminProductImportPage />
                </ProtectedRoute>
              } />
              <Route path="categories" element={
                <ProtectedRoute requiredPermissions={['categories.read']}>
                  <AdminCategoryListPage />
                </ProtectedRoute>
              } />
              <Route path="stores" element={
                <ProtectedRoute requiredPermissions={['stores.read']}>
                  <AdminStoreListPage />
                </ProtectedRoute>
              } />
              <Route path="stores/:id" element={
                <ProtectedRoute requiredPermissions={['stores.read']}>
                  <AdminStoreDetailPage />
                </ProtectedRoute>
              } />
              <Route path="orders" element={
                <ProtectedRoute requiredPermissions={['orders.read']}>
                  <AdminOrderListPage />
                </ProtectedRoute>
              } />
              <Route path="orders/:id" element={
                <ProtectedRoute requiredPermissions={['orders.read']}>
                  <AdminOrderDetailPage />
                </ProtectedRoute>
              } />
              <Route path="payments" element={
                <ProtectedRoute requiredPermissions={['payments.read']}>
                  <AdminPaymentListPage />
                </ProtectedRoute>
              } />
              <Route path="payments/:id" element={
                <ProtectedRoute requiredPermissions={['payments.read']}>
                  <AdminPaymentDetailPage />
                </ProtectedRoute>
              } />
              <Route path="receipts" element={
                <ProtectedRoute requiredPermissions={['payments.read']}>
                  <AdminReceiptListPage />
                </ProtectedRoute>
              } />
              <Route path="receipts/settings" element={
                <ProtectedRoute requiredPermissions={['payments.update']}>
                  <AdminReceiptSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="customers" element={
                <ProtectedRoute requiredPermissions={['users.read']}>
                  <AdminCustomerListPage />
                </ProtectedRoute>
              } />
              <Route path="customers/:id" element={
                <ProtectedRoute requiredPermissions={['users.read']}>
                  <AdminCustomerDetailPage />
                </ProtectedRoute>
              } />
              <Route path="content" element={
                <ProtectedRoute requiredPermissions={['content.read']}>
                  <AdminContentPage />
                </ProtectedRoute>
              } />
              <Route path="reviews" element={
                <ProtectedRoute requiredPermissions={['products.update']}>
                  <AdminReviewsPage />
                </ProtectedRoute>
              } />
              <Route path="coupons" element={
                <ProtectedRoute requiredPermissions={['coupons.read']}>
                  <AdminCouponListPage />
                </ProtectedRoute>
              } />
              <Route path="coupons/new" element={
                <ProtectedRoute requiredPermissions={['coupons.create']}>
                  <AdminCouponFormPage />
                </ProtectedRoute>
              } />
              <Route path="coupons/:id" element={
                <ProtectedRoute requiredPermissions={['coupons.update']}>
                  <AdminCouponFormPage />
                </ProtectedRoute>
              } />
              <Route path="campaigns" element={
                <ProtectedRoute requiredPermissions={['campaigns.read']}>
                  <AdminCampaignListPage />
                </ProtectedRoute>
              } />
              <Route path="campaigns/new" element={
                <ProtectedRoute requiredPermissions={['campaigns.create']}>
                  <AdminCampaignFormPage />
                </ProtectedRoute>
              } />
              <Route path="campaigns/:id" element={
                <ProtectedRoute requiredPermissions={['campaigns.read']}>
                  <AdminCampaignDetailPage />
                </ProtectedRoute>
              } />
              <Route path="campaigns/:id/edit" element={
                <ProtectedRoute requiredPermissions={['campaigns.update']}>
                  <AdminCampaignFormPage />
                </ProtectedRoute>
              } />
              <Route path="loyalty" element={
                <ProtectedRoute requiredPermissions={['promotions.read']}>
                  <AdminLoyaltyPage />
                </ProtectedRoute>
              } />
              <Route path="affiliates" element={
                <ProtectedRoute requiredPermissions={['affiliates.read']}>
                  <AdminAffiliatePage />
                </ProtectedRoute>
              } />
              <Route path="analytics" element={
                <ProtectedRoute requiredPermissions={['analytics.read']}>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              } />
              <Route path="notifications" element={
                <ProtectedRoute requiredPermissions={['messages.read']}>
                  <AdminNotificationPage />
                </ProtectedRoute>
              } />
              <Route path="messages" element={
                <ProtectedRoute requiredPermissions={['messages.read']}>
                  <AdminMessageListPage />
                </ProtectedRoute>
              } />
              <Route path="payouts" element={
                <ProtectedRoute requiredPermissions={['stores.read']}>
                  <AdminPayoutListPage />
                </ProtectedRoute>
              } />
              <Route path="reports" element={
                <ProtectedRoute requiredPermissions={['reports.read']}>
                  <AdminReportListPage />
                </ProtectedRoute>
              } />
              <Route path="returns" element={
                <ProtectedRoute requiredPermissions={['orders.read']}>
                  <AdminReturnListPage />
                </ProtectedRoute>
              } />
              <Route path="disputes" element={
                <ProtectedRoute requiredPermissions={['disputes.read']}>
                  <AdminDisputeListPage />
                </ProtectedRoute>
              } />
              <Route path="disputes/:id" element={
                <ProtectedRoute requiredPermissions={['disputes.read']}>
                  <AdminDisputeDetailPage />
                </ProtectedRoute>
              } />
              <Route path="admins" element={
                <ProtectedRoute requiredPermissions={['admins.read']}>
                  <AdminAdminListPage />
                </ProtectedRoute>
              } />
              <Route path="roles" element={
                <ProtectedRoute requiredPermissions={['roles.read']}>
                  <AdminRoleListPage />
                </ProtectedRoute>
              } />
              <Route path="audit" element={
                <ProtectedRoute requiredPermissions={['audit.read']}>
                  <AdminAuditPage />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute requiredPermissions={['settings.read']}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="features" element={
                <ProtectedRoute requiredPermissions={['features.read']}>
                  <AdminFeaturesPage />
                </ProtectedRoute>
              } />
              <Route path="shipping" element={
                <ProtectedRoute requiredPermissions={['shipping.read']}>
                  <AdminShippingPage />
                </ProtectedRoute>
              } />
              <Route path="delivery" element={
                <ProtectedRoute requiredPermissions={['shipping.read']}>
                  <AdminDeliveryListPage />
                </ProtectedRoute>
              } />
              <Route path="delivery/assignments" element={
                <ProtectedRoute requiredPermissions={['shipping.read']}>
                  <AdminDeliveryAssignmentsPage />
                </ProtectedRoute>
              } />
              <Route path="delivery/:id" element={
                <ProtectedRoute requiredPermissions={['shipping.read']}>
                  <AdminDeliveryDetailPage />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AdminAuthProvider>
        </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
