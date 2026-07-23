CREATE TABLE IF NOT EXISTS "banners" (
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
CREATE TABLE IF NOT EXISTS "feed_sections" (
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
CREATE TABLE IF NOT EXISTS "logos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context" text NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_methods" (
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
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payment_methods_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seo_metadata" (
	"page" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"keywords" text NOT NULL,
	"og_image" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_links" (
	"platform" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"icon" text DEFAULT 'link' NOT NULL,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "static_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'html' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "static_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"subject" text NOT NULL,
	"last_message" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_to" uuid,
	"unread" boolean DEFAULT true,
	"message_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "internal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_admin_id" uuid NOT NULL,
	"from_admin_name" text NOT NULL,
	"to_admin_id" uuid NOT NULL,
	"to_admin_name" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"thread" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_codes" (
	"contact" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_tickets_assigned_to_admins_id_fk') THEN\n    -- removed duplicate constraint admin_tickets_assigned_to_admins_id_fk (kept in 0006_admin_messages.sql)\n  END IF;\nEND $;--> statement-breakpoint
DO $\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_ticket_id_admin_tickets_id_fk') THEN\n    -- removed duplicate constraint ticket_messages_ticket_id_admin_tickets_id_fk (kept in 0006_admin_messages.sql)\n  END IF;\nEND $;
