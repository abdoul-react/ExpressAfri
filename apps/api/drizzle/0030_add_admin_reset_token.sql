ALTER TABLE "admins" ADD COLUMN "reset_token" text;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "reset_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "store_kyc" ADD COLUMN "rejection_reason" text;