CREATE TABLE "shipment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tracking_number" text,
	"tracking_url" text,
	"delivery_person_id" uuid,
	"status" text DEFAULT 'preparing',
	"notes" text,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "language" text DEFAULT 'fr';--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "issue_reason" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "receipt_settings" ADD COLUMN "brand_name" text;--> statement-breakpoint
ALTER TABLE "receipt_settings" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "receipt_settings" ADD COLUMN "show_barcode" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "receipt_settings" ADD COLUMN "accent_color" text DEFAULT '#f97316';--> statement-breakpoint
ALTER TABLE "otp_codes" ADD COLUMN "attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD COLUMN "max_attempts" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD COLUMN "used_at" timestamp with time zone;--> statement-breakpoint
DO $\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipment_items_shipment_id_shipments_id_fk') THEN\n    ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;\n  END IF;\nEND $;--> statement-breakpoint
DO $\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_order_id_orders_id_fk') THEN\n    ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;\n  END IF;\nEND $;--> statement-breakpoint
DO $\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_store_id_stores_id_fk') THEN\n    ALTER TABLE "shipments" ADD CONSTRAINT "shipments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;\n  END IF;\nEND $;--> statement-breakpoint
DO $\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_tokens_customer_id_customers_id_fk') THEN\n    ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;\n  END IF;\nEND $;
