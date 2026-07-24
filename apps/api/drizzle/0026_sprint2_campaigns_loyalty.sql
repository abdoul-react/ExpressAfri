CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) DEFAULT 'banner' NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"budget" numeric(12, 2),
	"spent" numeric(12, 2) DEFAULT '0',
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"revenue" numeric(12, 2) DEFAULT '0',
	"target_type" varchar(50) DEFAULT 'all',
	"target_value" varchar(255),
	"image_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "loyalty_rewards" ALTER COLUMN "store_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_rules" ALTER COLUMN "store_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;