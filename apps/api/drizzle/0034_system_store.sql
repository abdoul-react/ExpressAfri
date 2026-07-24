-- Boutique système nécessaire comme FK pour les catégories globales de la plateforme
INSERT INTO stores (id, name, email, country, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ExpressAfri Système',
  'system@expressafri.com',
  'Niger',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
