ALTER TABLE "receipt_settings" ADD COLUMN IF NOT EXISTS "brand_name" text;
ALTER TABLE "receipt_settings" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "receipt_settings" ADD COLUMN IF NOT EXISTS "show_barcode" boolean DEFAULT false;
ALTER TABLE "receipt_settings" ADD COLUMN IF NOT EXISTS "accent_color" text DEFAULT '#f97316';
