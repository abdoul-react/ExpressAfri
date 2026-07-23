ALTER TABLE "payments" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_payment_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "webhook_event_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_idempotency_unique" ON "payments" USING btree ("provider","idempotency_key") WHERE "payments"."provider" IS NOT NULL AND "payments"."idempotency_key" IS NOT NULL;