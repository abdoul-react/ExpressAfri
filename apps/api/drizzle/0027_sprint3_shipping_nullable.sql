ALTER TABLE "shipping_methods" ALTER COLUMN "store_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_rules" ALTER COLUMN "store_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_zones" ALTER COLUMN "store_id" DROP NOT NULL;