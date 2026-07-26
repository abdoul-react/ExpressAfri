-- Correctif d'autorisation : le rôle Marketing doit pouvoir LIRE boutiques et
-- produits.
--
-- Contexte : les routes `GET /products` et `GET /stores` étaient ouvertes à tout
-- admin authentifié (le PermissionsGuard laisse passer toute route sans
-- @Permissions). En les fermant, Marketing perd l'accès au TargetSelector des
-- coupons et campagnes — les listes de ciblage tombent silencieusement à vide.
--
-- On accorde donc les deux lectures manquantes, et rien de plus : Marketing ne
-- crée, ne modifie ni ne supprime aucune boutique ni aucun produit.
UPDATE roles
SET permissions = array_append(permissions, 'stores.read')
WHERE label = 'Marketing'
  AND is_super_admin = false
  AND NOT ('stores.read' = ANY (permissions));

UPDATE roles
SET permissions = array_append(permissions, 'products.read')
WHERE label = 'Marketing'
  AND is_super_admin = false
  AND NOT ('products.read' = ANY (permissions));
