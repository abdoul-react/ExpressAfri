-- Sections de catalogue propres à chaque boutique (§27 du plan de refonte).
-- Chaque boutiquier crée ses propres sections : le contenu est cloisonné par
-- boutique, une section n'est jamais partagée entre deux boutiques.
CREATE TABLE IF NOT EXISTS store_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  -- grid | rail | list | showcase — format des cartes produit de la section
  layout text NOT NULL DEFAULT 'grid',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_sections_store_idx
  ON store_sections(store_id, is_active, sort_order);

-- Affectation des produits à une section, avec ordre d'affichage.
CREATE TABLE IF NOT EXISTS store_section_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES store_sections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Un produit ne peut pas être ajouté deux fois à la même section.
CREATE UNIQUE INDEX IF NOT EXISTS store_section_items_unique
  ON store_section_items(section_id, product_id);
CREATE INDEX IF NOT EXISTS store_section_items_section_idx
  ON store_section_items(section_id, sort_order);
