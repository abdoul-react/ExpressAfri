-- Gérants de boutique : un admin peut être rattaché à UNE boutique.
-- Toutes ses lectures/écritures sont alors cloisonnées à cette boutique côté serveur.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;
