-- Sections de la LISTE des boutiques (vitrine marketplace).
-- À ne pas confondre avec `store_sections` (0038) qui regroupe des PRODUITS à
-- l'intérieur d'une boutique. Ici on regroupe des BOUTIQUES par thème
-- (« Vêtements homme », « Électronique »…). Ces sections sont transverses :
-- elles n'appartiennent à aucune boutique et relèvent de l'admin central seul.
CREATE TABLE IF NOT EXISTS store_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_groups_active_idx
  ON store_groups(is_active, sort_order);

-- Affectation d'une boutique à une section, avec ordre d'affichage.
CREATE TABLE IF NOT EXISTS store_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES store_groups(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Une boutique ne peut pas figurer deux fois dans la même section.
CREATE UNIQUE INDEX IF NOT EXISTS store_group_items_unique
  ON store_group_items(group_id, store_id);
CREATE INDEX IF NOT EXISTS store_group_items_group_idx
  ON store_group_items(group_id, sort_order);
-- Sert la question inverse : « dans quelles sections est cette boutique ? »
CREATE INDEX IF NOT EXISTS store_group_items_store_idx
  ON store_group_items(store_id);
