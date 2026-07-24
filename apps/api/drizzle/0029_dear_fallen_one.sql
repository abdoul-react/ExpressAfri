ALTER TABLE "campaigns" ADD COLUMN "store_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "target_audience" varchar(64);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;