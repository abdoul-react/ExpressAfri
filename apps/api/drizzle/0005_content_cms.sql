CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"image_url" text NOT NULL,
	"link_url" text,
	"cta_text" text,
	"discount_label" text,
	"is_active" boolean DEFAULT true,
	"position" integer DEFAULT 0 NOT NULL,
	"screen" text DEFAULT 'home' NOT NULL,
	"background_color" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "static_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'html' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "logos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context" text NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"display_style" text DEFAULT 'horizontal-scroll' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"platform" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"icon" text DEFAULT 'link' NOT NULL,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"page" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"keywords" text NOT NULL,
	"og_image" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text NOT NULL,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"position" integer DEFAULT 0 NOT NULL,
	"fee_percent" double precision DEFAULT 0 NOT NULL,
	"fee_fixed" double precision DEFAULT 0 NOT NULL,
	"min_amount" double precision,
	"max_amount" double precision,
	"supported_countries" text[] DEFAULT '{}',
	"api_key" text,
	"api_secret" text,
	"api_endpoint" text,
	"is_sandbox" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "static_pages_slug_idx" ON "static_pages" ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_code_idx" ON "payment_methods" ("code");
