-- 0025_orders_idempotency_unique_store.sql
-- Nettoyer les doublons par (store_id, idempotency_key), conserver la plus ancienne, puis créer un index unique partiel par boutique.

-- Supprimer les doublons : pour chaque (store_id, idempotency_key) conserver la ligne la plus ancienne
DELETE FROM orders a
USING orders b
WHERE a.idempotency_key IS NOT NULL
  AND a.idempotency_key = b.idempotency_key
  AND a.store_id = b.store_id
  AND a.created_at > b.created_at;

-- Créer un index unique partiel par boutique
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique_store ON orders (store_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Optionnel : supprimer l'ancien index non-scopé si présent
DROP INDEX IF EXISTS orders_idempotency_key_unique;
