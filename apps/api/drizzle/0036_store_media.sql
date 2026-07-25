-- Médias de boutique : logo, cover et galerie administrables
CREATE TABLE IF NOT EXISTS store_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type text NOT NULL,
  url text NOT NULL,
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_media_store_idx ON store_media(store_id, type, sort_order);

-- Un seul logo et un seul cover actifs par boutique
CREATE UNIQUE INDEX IF NOT EXISTS store_media_single_logo
  ON store_media(store_id) WHERE type = 'logo' AND is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS store_media_single_cover
  ON store_media(store_id) WHERE type = 'cover' AND is_active = true;

-- Alignement des statuts boutique : l'admin écrit 'approved', le mobile lisait 'active'
UPDATE stores SET status = 'approved' WHERE status = 'active';

CREATE INDEX IF NOT EXISTS products_store_idx ON products(store_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS categories_store_idx ON categories(store_id);
