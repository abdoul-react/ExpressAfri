import type { AdminAuthDataSource } from './AdminAuthDataSource'
import type { AdminProductDataSource } from './AdminProductDataSource'
import type { AdminOrderDataSource } from './AdminOrderDataSource'
import type { AdminCategoryDataSource } from './AdminCategoryDataSource'
import type { AdminUserDataSource } from './AdminUserDataSource'
import type { AdminStoreDataSource } from './AdminStoreDataSource'
import type { AdminPaymentDataSource } from './AdminPaymentDataSource'
import type { AdminContentDataSource } from './AdminContentDataSource'
import type { AdminCouponDataSource } from './AdminCouponDataSource'
import type { AdminAnalyticsDataSource } from './AdminAnalyticsDataSource'
import type { AdminCampaignDataSource } from './AdminCampaignDataSource'
import type { AdminAdminDataSource } from './AdminAdminDataSource'
import type { AdminRoleDataSource } from './AdminRoleDataSource'
import type { AdminPermissionDataSource } from './AdminPermissionDataSource'
import type { AdminAuditDataSource } from './AdminAuditDataSource'
import type { AdminSettingDataSource } from './AdminSettingDataSource'
import type { AdminMessageDataSource } from './AdminMessageDataSource'
import type { AdminShippingDataSource } from './AdminShippingDataSource'
import type { AdminReportDataSource } from './AdminReportDataSource'
import type { AdminReceiptDataSource } from './AdminReceiptDataSource'
import type { AdminDeliveryDataSource } from './AdminDeliveryDataSource'
import type { AdminDisputeDataSource } from './AdminDisputeDataSource'
import type { AdminPayoutDataSource } from './AdminPayoutDataSource'
import type { AdminReturnDataSource } from './AdminReturnDataSource'
import type { AdminNotificationDataSource } from './AdminNotificationDataSource'
import type { AdminLoyaltyDataSource } from './AdminLoyaltyDataSource'
import type { AdminAffiliateDataSource } from './AdminAffiliateDataSource'

// API-based implementations (Phase 2 — connected to backend)
import { ApiAdminAuthDataSource } from './api/ApiAdminAuthDataSource'
import { ApiAdminProductDataSource } from './api/ApiAdminProductDataSource'
import { ApiAdminOrderDataSource } from './api/ApiAdminOrderDataSource'
import { ApiAdminCategoryDataSource } from './api/ApiAdminCategoryDataSource'
import { ApiAdminStoreDataSource } from './api/ApiAdminStoreDataSource'
import { ApiAdminCouponDataSource } from './api/ApiAdminCouponDataSource'
import { ApiAdminAffiliateDataSource } from './api/ApiAdminAffiliateDataSource'
import { ApiAdminAnalyticsDataSource } from './api/ApiAdminAnalyticsDataSource'
import { ApiAdminPaymentDataSource } from './api/ApiAdminPaymentDataSource'
import { ApiAdminReturnDataSource } from './api/ApiAdminReturnDataSource'
import { ApiAdminPayoutDataSource } from './api/ApiAdminPayoutDataSource'
import { ApiAdminUserDataSource } from './api/ApiAdminUserDataSource'
import { ApiAdminAdminDataSource } from './api/ApiAdminAdminDataSource'
import { ApiAdminRoleDataSource } from './api/ApiAdminRoleDataSource'
import { ApiAdminNotificationDataSource } from './api/ApiAdminNotificationDataSource'
import { ApiAdminLoyaltyDataSource } from './api/ApiAdminLoyaltyDataSource'
import { ApiAdminCampaignDataSource } from './api/ApiAdminCampaignDataSource'
import { ApiAdminContentDataSource } from './api/ApiAdminContentDataSource'
import { ApiAdminMessageDataSource } from './api/ApiAdminMessageDataSource'
import { ApiAdminReceiptDataSource } from './api/ApiAdminReceiptDataSource'
import { ApiAdminReportDataSource } from './api/ApiAdminReportDataSource'
import { ApiAdminDisputeDataSource } from './api/ApiAdminDisputeDataSource'
import { ApiAdminAuditDataSource } from './api/ApiAdminAuditDataSource'
import { ApiAdminDeliveryDataSource } from './api/ApiAdminDeliveryDataSource'
import { ApiAdminShippingDataSource } from './api/ApiAdminShippingDataSource'
import { ApiAdminPermissionDataSource } from './api/ApiAdminPermissionDataSource'
import { ApiAdminSettingDataSource } from './api/ApiAdminSettingDataSource'

// Mock implementations (still on mock data — Phase 4 modules)
import { MockAdminAuthDataSource } from './mock/MockAdminAuthDataSource'
import { MockAdminProductDataSource } from './mock/MockAdminProductDataSource'
import { MockAdminOrderDataSource } from './mock/MockAdminOrderDataSource'
import { MockAdminCategoryDataSource } from './mock/MockAdminCategoryDataSource'
import { MockAdminStoreDataSource } from './mock/MockAdminStoreDataSource'
import { MockAdminCouponDataSource } from './mock/MockAdminCouponDataSource'
import { MockAdminAnalyticsDataSource } from './mock/MockAdminAnalyticsDataSource'
import { MockAdminAffiliateDataSource } from './mock/MockAdminAffiliateDataSource'

// API-connected data sources
export const adminAuthDataSource: AdminAuthDataSource = new ApiAdminAuthDataSource()
export const adminProductDataSource: AdminProductDataSource = new ApiAdminProductDataSource()
export const adminOrderDataSource: AdminOrderDataSource = new ApiAdminOrderDataSource()
export const adminCategoryDataSource: AdminCategoryDataSource = new ApiAdminCategoryDataSource()
export const adminStoreDataSource: AdminStoreDataSource = new ApiAdminStoreDataSource()
export const adminCouponDataSource: AdminCouponDataSource = new ApiAdminCouponDataSource()
export const adminAffiliateDataSource: AdminAffiliateDataSource = new ApiAdminAffiliateDataSource()
export const adminPaymentDataSource: AdminPaymentDataSource = new ApiAdminPaymentDataSource()
export const adminReturnDataSource: AdminReturnDataSource = new ApiAdminReturnDataSource()
export const adminPayoutDataSource: AdminPayoutDataSource = new ApiAdminPayoutDataSource()
export const adminUserDataSource: AdminUserDataSource = new ApiAdminUserDataSource()
export const adminAdminDataSource: AdminAdminDataSource = new ApiAdminAdminDataSource()
export const adminRoleDataSource: AdminRoleDataSource = new ApiAdminRoleDataSource()
export const adminNotificationDataSource: AdminNotificationDataSource = new ApiAdminNotificationDataSource()
export const adminLoyaltyDataSource: AdminLoyaltyDataSource = new ApiAdminLoyaltyDataSource()
export const adminCampaignDataSource: AdminCampaignDataSource = new ApiAdminCampaignDataSource()
export const adminContentDataSource: AdminContentDataSource = new ApiAdminContentDataSource()
export const adminMessageDataSource: AdminMessageDataSource = new ApiAdminMessageDataSource()
export const adminAnalyticsDataSource: AdminAnalyticsDataSource = new ApiAdminAnalyticsDataSource()
export const adminReceiptDataSource: AdminReceiptDataSource = new ApiAdminReceiptDataSource()
export const adminReportDataSource: AdminReportDataSource = new ApiAdminReportDataSource()
export const adminDisputeDataSource: AdminDisputeDataSource = new ApiAdminDisputeDataSource()
export const adminAuditDataSource: AdminAuditDataSource = new ApiAdminAuditDataSource()
export const adminDeliveryDataSource: AdminDeliveryDataSource = new ApiAdminDeliveryDataSource()
export const adminShippingDataSource: AdminShippingDataSource = new ApiAdminShippingDataSource()

// Connected to API
export const adminPermissionDataSource: AdminPermissionDataSource = new ApiAdminPermissionDataSource()
export const adminSettingDataSource: AdminSettingDataSource = new ApiAdminSettingDataSource()
