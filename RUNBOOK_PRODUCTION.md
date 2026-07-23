# RUNBOOK PRODUCTION — ExpressAfri

## 1. Sauvegarde PostgreSQL

### Automatisation (via cron, à configurer sur le serveur de base de données)

```bash
# Exemple crontab : tous les jours à 2h00
0 2 * * * pg_dump -U expressafri -d expressafri -Fc -f /backups/postgres/expressafri_$(date +\%Y\%m\%d).dump

# Toutes les 6 heures avec rétention 7 jours
0 */6 * * * pg_dump -U expressafri -d expressafri -Fc -f /backups/postgres/expressafri_$(date +\%Y\%m\%d_\%H).dump && find /backups/postgres -name '*.dump' -mtime +7 -delete
```

### Via script Docker

```bash
docker exec expressafri-postgres pg_dump -U expressafri -d expressafri -Fc > /backups/expressafri_$(date +%F).dump
```

### Politique de rétention
- Sauvegardes horaires : 48 heures
- Sauvegardes quotidiennes : 30 jours
- Sauvegardes hebdomadaires : 12 semaines
- Sauvegardes mensuelles : 12 mois (stockage froid)

### Chiffrement
Les sauvegardes doivent être chiffrées avec GPG avant transfert vers un stockage externe (S3/MinIO) :

```bash
gpg --encrypt --recipient backup-key < expressafri_20260724.dump > expressafri_20260724.dump.gpg
```

## 2. Test de restauration

### Procédure mensuelle

```bash
# 1. Créer une base de test
createdb expressafri_restore_test

# 2. Restaurer la dernière sauvegarde
pg_restore -U expressafri -d expressafri_restore_test -j 4 /backups/postgres/expressafri_latest.dump

# 3. Vérifier l'intégrité
psql -U expressafri -d expressafri_restore_test -c "SELECT count(*) FROM orders;"
psql -U expressafri -d expressafri_restore_test -c "SELECT count(*) FROM products;"
psql -U expressafri -d expressafri_restore_test -c "SELECT status, count(*) FROM orders GROUP BY status;"

# 4. Lancer la migration (vérifier compatibilité)
DATABASE_URL=postgres://expressafri:xxx@localhost:5432/expressafri_restore_test npx drizzle-kit migrate

# 5. Lancer les tests
DATABASE_URL=postgres://expressafri:xxx@localhost:5432/expressafri_restore_test npm test

# 6. Nettoyer
dropdb expressafri_restore_test
```

### Script automatisé

Un script `scripts/test-restore.sh` doit être créé pour exécuter ces étapes et notifier l'équipe en cas d'échec.

### Validation
Une restauration est considérée réussie si :
- Toutes les tables contiennent le même nombre de lignes qu'avant la sauvegarde
- Les contraintes d'intégrité référentielle sont valides
- Les migrations Drizzle s'appliquent sans erreur
- `npx tsc --noEmit` passe
- `npm test` passe
- Les endpoints health répondent OK

## 3. Rotation des uploads

### Stockage local (dev/test)

Les fichiers uploadés dans `uploads/` sont nettoyés automatiquement :

```bash
# Supprimer les fichiers orphelins (non référencés en base) — à exécuter quotidiennement
node scripts/cleanup-orphan-uploads.js
```

### Stockage objet (production)

Les reçus PDF, photos produits et pièces justificatives sont stockés dans un bucket S3/MinIO.

### Politique de rotation
- Photos produits : conservées tant que le produit est actif + 90 jours après désactivation
- Reçus PDF : conservés 10 ans (obligation légale/fiscale)
- Pièces justificatives de retour : conservées 3 ans
- Fichiers temporaires (imports, exports) : supprimés après 24h

### Cycle de vie S3 (bucket production)

```json
{
  "Rules": [
    {
      "Id": "expire-temp-files",
      "Prefix": "temp/",
      "Status": "Enabled",
      "Expiration": { "Days": 1 }
    },
    {
      "Id": "expire-inactive-products",
      "Prefix": "products/",
      "Status": "Enabled",
      "Expiration": { "Days": 90 }
    }
  ]
}
```

### Restauration testée
Une fois par trimestre, restaurer un reçu aléatoire depuis le stockage objet et vérifier son contenu PDF.

## 4. Procédure de rollback

### Rollback applicatif (Docker)

```bash
# Revenir à la version précédente
docker pull expressafri/api:previous
docker service update --image expressafri/api:previous expressafri_api
```

### Rollback base de données

Une migration Drizzle peut être annulée uniquement si elle est backward-compatible (ajout de colonne nullable, création de table).

```sql
-- Exemple : annuler une migration non destructive
ALTER TABLE orders DROP COLUMN IF EXISTS new_column;
```

Pour les migrations destructives, la restauration complète de la base est nécessaire :

```bash
# 1. Arrêter l'API
docker service scale expressafri_api=0

# 2. Restaurer la base depuis la sauvegarde pré-migration
pg_restore -U expressafri -d expressafri -c /backups/postgres/pre_migration_20260724.dump

# 3. Redémarrer l'API
docker service scale expressafri_api=1
```

### Pré-requis rollback
- Sauvegarde complète de la base avant chaque déploiement
- Tag Docker `previous` mis à jour automatiquement avant chaque nouveau déploiement
- Variables d'environnement documentées dans `.env.example`

### Checklist rollback
1. Vérifier que la sauvegarde pré-déploiement existe et est intègre
2. Arrêter les workers outbox (éviter traitement d'événements incohérents)
3. Restaurer la base de données
4. Redémarrer l'API avec l'image précédente
5. Vérifier les health endpoints
6. Vérifier un échantillon de commandes et reçus
7. Réactiver les workers outbox

## 5. Release Checklist

### Pré-requis (avant chaque release)
- [ ] La CI est verte sur la branche `main` (tous les jobs : lint, typecheck, audit, migrations, tests, build, secrets scan)
- [ ] La CI a exécuté les migrations sur une base PostgreSQL vierge sans erreur
- [ ] Les tests e2e passent sur la base de CI
- [ ] `npm audit --audit-level=high` ne remonte aucune vulnérabilité haute ou critique
- [ ] Aucun secret n'est commité (vérifié par le job secrets-scan)
- [ ] La sauvegarde pré-déploiement de la base de production existe

### Validation de la migration
- [ ] Les migrations sont backward-compatibles (pas de `DROP COLUMN` ou `ALTER COLUMN` non nullable sans migration en deux temps)
- [ ] La migration a été testée sur une copie de la base de production
- [ ] Le rollback de la migration est documenté et testé

### Variables d'environnement
- [ ] Toute nouvelle variable d'environnement est documentée dans `apps/api/.env.example` et `.env.example` (racine)
- [ ] Les secrets de production sont configurés dans GitHub Actions Secrets (pas dans les fichiers)
- [ ] Les valeurs par défaut en développement sont compatibles avec la production

### Déploiement
- [ ] L'image Docker est construite et taguée (`expressafri/api:latest` et `expressafri/api:<version>`)
- [ ] L'image précédente est conservée sous le tag `expressafri/api:previous`
- [ ] Les workers outbox sont arrêtés avant la mise à jour
- [ ] La base de données est sauvegardée immédiatement avant la migration

### Smoke tests (post-déploiement)
- [ ] `GET /api/health` retourne `200 { status: 'ok' }`
- [ ] `GET /api/health/readiness` retourne `200 { status: 'ok', database: 'healthy', redis: 'healthy' }`
- [ ] Une commande de test peut être créée et consultée
- [ ] Un paiement de test peut être initialisé
- [ ] Les notifications push sont fonctionnelles
- [ ] Les logs JSON sont visibles dans l'outil de monitoring

### Approbation
- [ ] La release est approuvée manuellement par un responsable technique
- [ ] La release est approuvée manuellement par un responsable métier (si changement de contrat/fiscalité)
- [ ] Les parties prenantes sont notifiées (calendrier, fenêtre de maintenance, impact utilisateur)

## 6. Protection de branche

La branche `main` doit être protégée dans GitHub (Settings → Branches → Add branch protection rule) avec les règles suivantes :

### Règles obligatoires
- **Require a pull request before merging** — activé
  - **Required approvals** — au moins 1 approbation
  - **Dismiss stale pull request approvals when new commits are pushed** — activé
- **Require status checks to pass before merging** — activé
  - Statuts requis : `lint-and-typecheck`, `mobile-typecheck`, `migration-and-test`, `build`, `secrets-scan`
  - **Require branches to be up to date** — activé
- **Require conversation resolution before merging** — activé
- **Do not allow bypassing the above settings** — activé (include administrators)

### Restrictions
- **Restrict who can push to matching branches** — uniquement les administrateurs
- **Allow force pushes** — désactivé
- **Allow deletions** — désactivé

### Règle de release
- Aucun push direct sur `main` — toute modification passe par une PR avec CI verte
- Les releases sont créées via GitHub Releases (tag semantic versioning), jamais par push direct
- Le workflow CI ne déploie jamais automatiquement en production (aucun job `deploy` dans `ci.yml`)
