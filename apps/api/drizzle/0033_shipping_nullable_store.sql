-- shipping_zones, shipping_methods, shipping_rules : store_id devient nullable
-- Les zones et méthodes de livraison peuvent être définies au niveau plateforme
ALTER TABLE "shipping_zones" ALTER COLUMN "store_id" DROP NOT NULL;
ALTER TABLE "shipping_methods" ALTER COLUMN "store_id" DROP NOT NULL;
ALTER TABLE "shipping_rules" ALTER COLUMN "store_id" DROP NOT NULL;
