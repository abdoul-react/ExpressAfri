-- Fournisseurs SMS de la plateforme — même modèle que payment_gateways :
-- l'admin colle ses clés (chiffrées AES-256-GCM) et choisit le fournisseur
-- actif ; le code OTP part par SMS dès qu'un fournisseur est configuré,
-- sinon l'envoi est silencieusement ignoré (dev).
CREATE TABLE IF NOT EXISTS sms_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  credentials_encrypted text,
  -- Nom d'expéditeur affiché sur le téléphone (sender ID, soumis à
  -- enregistrement selon les pays)
  sender_id text,
  api_endpoint text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO sms_gateways (code, label) VALUES
  ('twilio',           'Twilio'),
  ('africas_talking',  'Africa''s Talking'),
  ('orange_sms',       'Orange SMS API'),
  ('sms_mock',         'Mock (développement)')
ON CONFLICT (code) DO NOTHING;
