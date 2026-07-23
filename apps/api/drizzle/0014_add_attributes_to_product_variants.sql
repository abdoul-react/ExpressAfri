ALTER TABLE "admins" ADD COLUMN "store_id" uuid;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "attributes" jsonb DEFAULT '[]'::jsonb;