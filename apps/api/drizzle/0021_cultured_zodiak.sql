ALTER TABLE "receipt_settings" ADD COLUMN "fiscal_year" integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE) NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_settings" ADD COLUMN "next_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "payment_id" uuid;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "fiscal_year" integer;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "sequence_number" integer;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "snapshot" jsonb;--> statement-breakpoint
DO $\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receipts_payment_id_payments_id_fk') THEN\n    ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;\n  END IF;\nEND $;--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_settings_store_year_unique" ON "receipt_settings" USING btree ("store_id","fiscal_year");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_store_year_seq_unique" ON "receipts" USING btree ("store_id","fiscal_year","sequence_number") WHERE "receipts"."fiscal_year" IS NOT NULL AND "receipts"."sequence_number" IS NOT NULL;
