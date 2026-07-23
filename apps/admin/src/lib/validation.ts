import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200, 'Nom trop long'),
  description: z.string().min(1, 'Description requise'),
  price: z.number().positive('Prix doit être positif'),
  compareAtPrice: z.number().positive().optional(),
  categoryId: z.string().min(1, 'Catégorie requise'),
  images: z.array(z.string()).default([]),
  stock: z.number().int().min(0, 'Stock doit être ≥ 0'),
  sku: z.string().min(1, 'SKU requis'),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  variants: z.array(z.object({
    sku: z.string().min(1),
    price: z.number().positive(),
    stock: z.number().int().min(0),
    attributes: z.array(z.object({ name: z.string(), value: z.string() })),
    image: z.string().optional(),
    isActive: z.boolean().default(true),
  })).optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const createOrderSchema = z.object({
  status: z.string().min(1),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1, 'Statut requis'),
  reason: z.string().optional(),
})

export const cancelOrderSchema = z.object({
  reason: z.string().optional(),
})

export const refundOrderSchema = z.object({
  amount: z.number().positive().optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  isBanned: z.boolean().optional(),
})

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
})

export const createAffiliateSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  commissionRate: z.number().min(0).max(100).optional(),
})

export const updateAffiliateSchema = createAffiliateSchema.partial()

export const createLoyaltyRuleSchema = z.object({
  name: z.string().min(1),
  pointsPerUnit: z.number().positive().optional(),
  minOrderAmount: z.number().positive().optional(),
})

export const createLoyaltyRewardSchema = z.object({
  name: z.string().min(1),
  pointsCost: z.number().int().positive(),
})

export const createShippingZoneSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  countries: z.array(z.string()).min(1, 'Au moins un pays'),
  priority: z.number().int().default(0),
})

export const createShippingMethodSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  zoneId: z.string().min(1),
  baseRate: z.number().min(0),
  freeThreshold: z.number().positive().optional(),
  estimatedDaysMin: z.number().int().min(1).default(1),
  estimatedDaysMax: z.number().int().min(1).default(7),
  isActive: z.boolean().default(true),
})

export const createShippingRuleSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  zoneId: z.string().min(1),
  type: z.enum(['weight', 'price', 'quantity']).default('price'),
  minValue: z.number().min(0).default(0),
  maxValue: z.number().positive().optional(),
  rate: z.number().min(0),
  isActive: z.boolean().default(true),
})

export const createNotificationTemplateSchema = z.object({
  key: z.string().min(1, 'Clé requise'),
  subject: z.string().min(1),
  content: z.string().min(1),
  channels: z.array(z.string()).default([]),
})
