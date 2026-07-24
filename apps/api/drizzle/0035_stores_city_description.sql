-- Ajout colonnes city et description à la table stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS description text;
