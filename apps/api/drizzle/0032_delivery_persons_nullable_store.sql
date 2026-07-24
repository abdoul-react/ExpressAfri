-- delivery_persons: storeId devient nullable
-- Les livreurs sont gérés au niveau plateforme, pas par boutique
ALTER TABLE "delivery_persons" ALTER COLUMN "store_id" DROP NOT NULL;
