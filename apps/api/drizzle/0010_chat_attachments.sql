ALTER TABLE "messages" ADD COLUMN "type" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_to_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "content" SET DEFAULT '';
