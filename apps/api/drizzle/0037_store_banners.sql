-- Bannières publicitaires par boutique.
-- store_id NULL = bannière globale gérée par l'Admin central (comportement actuel conservé).
-- store_id renseigné = bannière de campagne créée par le gérant de la boutique.
ALTER TABLE banners ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS banners_store_idx ON banners(store_id, is_active, position);
