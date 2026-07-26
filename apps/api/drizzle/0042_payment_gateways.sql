-- Passerelles de paiement de la plateforme (§ cadre PSP configurable).
--
-- `payment_methods` reste le catalogue AFFICHÉ au client ; chaque méthode est
-- désormais ROUTÉE vers une passerelle (agrégateur ou API directe opérateur)
-- choisie par l'admin via `gateway_code`. Les clés API vivent ici, chiffrées
-- AES-256-GCM d'un bloc — jamais en clair, contrairement aux anciennes
-- colonnes api_key/api_secret de payment_methods (conservées mais dépréciées).
CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT true,
  credentials_encrypted text,
  webhook_secret_encrypted text,
  api_endpoint text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS gateway_code text;

-- Les passerelles connues, toutes désactivées : l'admin les configure et les
-- active depuis le back-office le jour où les contrats PSP sont signés.
INSERT INTO payment_gateways (code, label) VALUES
  ('cinetpay',      'CinetPay (agrégateur UEMOA)'),
  ('paydunya',      'PayDunya (agrégateur UEMOA)'),
  ('flutterwave',   'Flutterwave (agrégateur panafricain)'),
  ('paystack',      'Paystack (agrégateur)'),
  ('stripe',        'Stripe (cartes internationales)'),
  ('orange_direct', 'Orange Money (API directe)'),
  ('wave_direct',   'Wave (API directe)'),
  ('mtn_direct',    'MTN MoMo (API directe)'),
  ('mock',          'Mock (développement)')
ON CONFLICT (code) DO NOTHING;
