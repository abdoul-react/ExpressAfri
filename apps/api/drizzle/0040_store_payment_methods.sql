-- Moyens de paiement CLOISONNÉS PAR BOUTIQUE (§22 du plan de refonte).
--
-- La table globale `payment_methods` reste en place mais change de rôle : elle
-- devient le CATALOGUE des providers autorisés par l'admin central. Un
-- boutiquier ne peut activer qu'un provider figurant dans ce catalogue ; il ne
-- peut ni le créer ni le modifier. Ce qu'il configure — libellé, logo,
-- instructions, ordre, activation, clés PSP — vit ici, borné sur `store_id`.
CREATE TABLE IF NOT EXISTS store_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  -- mobile_money | card | wallet | cash_on_delivery
  type text NOT NULL,
  -- Code du provider, tel que déclaré dans le catalogue `payment_methods.code`.
  provider text NOT NULL,
  display_name text NOT NULL,
  description text,
  logo_url text,
  icon_url text,
  instructions text,
  countries text[] DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  -- JSON sans aucun secret : numéro de compte affiché, devise, libellés…
  metadata_public jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Référence vers le secret chiffré, jamais la valeur brute.
  secret_ref text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Une boutique ne configure qu'une seule fois un provider donné : deux lignes
-- concurrentes pour le même provider rendraient l'éligibilité ambiguë au
-- moment du checkout.
CREATE UNIQUE INDEX IF NOT EXISTS store_payment_methods_unique
  ON store_payment_methods(store_id, provider);
CREATE INDEX IF NOT EXISTS store_payment_methods_store_idx
  ON store_payment_methods(store_id, is_enabled, sort_order);

-- Configuration détaillée : une ligne par champ. Les champs sensibles vont
-- dans `value_encrypted` (AES-256-GCM), les autres dans `value_public`.
-- Jamais les deux à la fois.
CREATE TABLE IF NOT EXISTS store_payment_method_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_payment_method_id uuid NOT NULL
    REFERENCES store_payment_methods(id) ON DELETE CASCADE,
  key text NOT NULL,
  value_encrypted text,
  value_public text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_payment_method_configs_unique
  ON store_payment_method_configs(store_payment_method_id, key);
