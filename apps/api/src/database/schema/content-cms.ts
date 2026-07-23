import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, doublePrecision, unique } from 'drizzle-orm/pg-core'

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  linkUrl: text('link_url'),
  ctaText: text('cta_text'),
  discountLabel: text('discount_label'),
  isActive: boolean('is_active').default(true),
  position: integer('position').notNull().default(0),
  screen: text('screen', { enum: ['home', 'store', 'feed', 'account'] }).notNull().default('home'),
  backgroundColor: text('background_color'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const staticPages = pgTable('static_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type', { enum: ['text', 'html', 'richtext'] }).notNull().default('html'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const logos = pgTable('logos', {
  id: uuid('id').primaryKey().defaultRandom(),
  context: text('context', { enum: ['splash', 'tab-bar', 'login', 'header', 'favicon', 'email', 'notification'] }).notNull(),
  url: text('url').notNull(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const feedSections = pgTable('feed_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  type: text('type', { enum: ['products', 'stores', 'banners', 'categories', 'inspiration', 'custom'] }).notNull(),
  displayStyle: text('display_style', { enum: ['horizontal-scroll', 'grid', 'list', 'card'] }).notNull().default('horizontal-scroll'),
  position: integer('position').notNull().default(0),
  isActive: boolean('is_active').default(true),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Publications du fil « Inspiration » (onglet central) — gérées par l'admin
export const feedPosts = pgTable('feed_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  mediaType: text('media_type', { enum: ['image', 'video'] }).notNull().default('image'),
  mediaUrl: text('media_url').notNull(),
  // Miniature pour les vidéos (facultative ; sinon la vidéo est affichée en poster)
  thumbnailUrl: text('thumbnail_url'),
  // Ratio hauteur/largeur du média (ex: 1.33) pour un masonry fidèle sans déformation
  aspectRatio: doublePrecision('aspect_ratio').notNull().default(1),
  duration: text('duration'),
  authorName: text('author_name').notNull().default('AfriExpress'),
  authorAvatar: text('author_avatar'),
  // Lien optionnel au tap (produit, boutique, page…)
  linkUrl: text('link_url'),
  position: integer('position').notNull().default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Likes des publications (un like par client et par publication)
export const feedPostLikes = pgTable('feed_post_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => feedPosts.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.postId, t.customerId)])

export const socialLinks = pgTable('social_links', {
  platform: text('platform').primaryKey(),
  url: text('url').notNull(),
  label: text('label').notNull(),
  icon: text('icon').notNull().default('link'),
  isActive: boolean('is_active').default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const seoMetadata = pgTable('seo_metadata', {
  page: text('page').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  keywords: text('keywords').notNull(),
  ogImage: text('og_image'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  logoUrl: text('logo_url').notNull(),
  type: text('type', { enum: ['mobile-money', 'card', 'wallet', 'cod'] }).notNull(),
  isActive: boolean('is_active').default(true),
  position: integer('position').notNull().default(0),
  feePercent: doublePrecision('fee_percent').notNull().default(0),
  feeFixed: doublePrecision('fee_fixed').notNull().default(0),
  minAmount: doublePrecision('min_amount'),
  maxAmount: doublePrecision('max_amount'),
  supportedCountries: text('supported_countries').array().default([]),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  apiEndpoint: text('api_endpoint'),
  isSandbox: boolean('is_sandbox').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
