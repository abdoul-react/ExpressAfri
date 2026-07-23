CREATE TABLE "store_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "store_follows_customer_id_store_id_unique" UNIQUE("customer_id","store_id")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "birth_year" integer;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_follows_customer_id_customers_id_fk') THEN
    ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_follows_store_id_stores_id_fk') THEN
    ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
