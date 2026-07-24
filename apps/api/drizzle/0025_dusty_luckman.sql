ALTER TABLE "customers" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "deleted_at" timestamp with time zone;