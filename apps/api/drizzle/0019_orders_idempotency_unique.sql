-- Nettoyer les doublons avant de créer l'index unique
DELETE FROM orders a USING orders b
WHERE a.idempotency_key IS NOT NULL
  AND a.idempotency_key = b.idempotency_key
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique ON "orders" USING btree ("idempotency_key") WHERE "orders"."idempotency_key" IS NOT NULL;