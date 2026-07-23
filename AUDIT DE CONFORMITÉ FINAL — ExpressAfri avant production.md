# AUDIT DE CONFORMITÉ FINAL — ExpressAfri avant production

# AUDIT DE CONFORMITÉ FINAL — ExpressAfri
## Objet
Ce document vérifie le commit GitHub `6fdb45f1cf6db28641f801ba1ce52ef6eaa202e3` par rapport au `CURSOR_MASTER_PLAN — ExpressAfri Production Fixes` et complète les corrections nécessaires pour atteindre un niveau réellement déployable en production.
## Verdict exécutif
Le commit a bien été poussé et couvre une partie importante du plan : guard admin global retiré, checkout serveur ajouté, stock atomique partiel, idempotency ajoutée, fulfillment partiel, messagerie admin/mobile, reçus PDF, OTP persistant, health check, Docker et CI.

**Verdict : conformité partielle, pas encore production-ready. Ne pas considérer le projet comme 100% validé et ne pas déployer avant l'exécution des phases de ce document.** Les changements existent, mais plusieurs implémentations sont incomplètes ou dangereuses dans les cas réels : paiement non finalisé, calculs de commande encore contrôlables par le client, transitions de statut non protégées, fulfillment non transactionnel, numérotation des reçus non séquentielle, absence de tests d'intégration, CI incomplète et observabilité insuffisante.
## Preuve de vérification
*   Branche vérifiée : `main`
*   Commit vérifié : `6fdb45f1cf6db28641f801ba1ce52ef6eaa202e3`
*   Message : `Production hardening: fulfillment, checkout, security, messaging, infrastructure`
*   Date observée : 23 juillet 2026
*   Diff annoncé : 33 fichiers, +8226 / -101

* * *
# 1\. Matrice de conformité du plan initial

| Phase | État | Conclusion |
| ---| ---| --- |
| 1\. Guard JWT admin | Partiellement couvert | Le provider global a été retiré, mais il faut prouver que tous les controllers admin sont protégés et que les routes client ne sont pas exposées. Ajouter des tests HTTP. |
| 2\. Checkout réel | Non conforme production | Création de commande et décrément de stock présents, mais paiement réel absent, prix/totaux encore fournis par le client dans `createFromCheckout`, adresse non validée de façon uniforme, clé idempotente non unique en base. |
| 3\. Fulfillment partiel | Partiellement couvert | Tables, UI et endpoints présents, mais absence de transaction, validation des items/quantités, transitions strictes et protection contre doublons. |
| 4\. Messagerie unifiée | Partiellement couvert | Pont admin vers conversations et messages système présents. Pas de temps réel robuste, push/email/SMS et garanties d'idempotence. |
| 5\. Reçus | Partiellement couvert | PDF et envoi dans la messagerie présents. Il manque la conformité de numérotation, le détail complet du reçu, la persistance durable, l'interface admin complète et l'envoi email/SMS réel. |
| 6\. Push notifications | Non conforme | Le listener écrit des messages système, mais aucune preuve d'un pipeline push robuste, queue, retry, tokens invalides et préférences utilisateur. |
| 7\. Sécurité et robustesse | Partiellement couvert | OTP persistant et stock atomique partiels. Rate limiting global, validation DTO stricte, contraintes DB, audit sécurité et protection des secrets restent à compléter. |
| 8\. UX mobile | Partiellement couvert | Le checkout est branché et certaines données sont dynamiques, mais l'expérience affiche un total local différent du total serveur et ne finalise pas le paiement. |
| 9\. Fraîcheur des données | Non prouvé | Aucun test ou preuve suffisante dans le commit pour focus refetch et pull-to-refresh global. |
| 10\. Infrastructure production | Partiellement couvert | Docker, health et CI présents. CI ne lance pas les tests, lint, migrations, PostgreSQL, audit de dépendances ni vérification d'architecture. |

* * *
# 2\. Anomalies critiques à corriger avant toute release
## C1. Paiement encore simulé ou incomplet
Dans `app/checkout/payment.tsx`, les informations carte et Mobile Money sont collectées, mais `createOrder()` crée seulement la commande. Aucun appel à un PSP réel, aucune autorisation, aucun webhook, aucune vérification de signature et aucun passage fiable de `pending` vers `paid/captured` n'est visible.

**Risque :** une commande peut être créée et le panier vidé sans paiement confirmé.

**Correction obligatoire :** introduire un module `payments` avec `PaymentProvider`, transaction paiement, statut `pending/authorized/captured/failed/refunded`, endpoint d'initialisation, callback/webhook signé, idempotency paiement et nettoyage du panier uniquement après succès selon le moyen de paiement.

Ne jamais traiter les données carte brutes dans l'API ExpressAfri. Utiliser un token ou une page hébergée par le prestataire PCI.
## C2. Le serveur fait encore confiance aux montants envoyés par le client
`OrdersService.createFromCheckout()` utilise `data.subtotal`, `shippingCost`, `taxAmount`, `discountAmount` et `total` fournis par le mobile. C'est exploitable : un client peut modifier le prix, les frais ou la remise.

**Correction obligatoire :** recalculer côté serveur à partir des produits actifs, variantes, prix courants, règles de livraison, taxes et coupons. Refuser les totaux client ou les traiter uniquement comme information de diagnostic. Ajouter des tests de falsification du prix.
## C3. IdempotencyKey non protégée contre la course
Le champ existe dans `orders`, mais il n'est pas unique dans le schéma montré. Deux requêtes concurrentes avec la même clé peuvent donc créer deux commandes.

**Correction obligatoire :** ajouter une contrainte unique DB sur `idempotency_key`, idéalement index partiel par vendeur si le modèle le nécessite, et gérer proprement la violation de contrainte en retournant la commande existante.
## C4. Fulfillment partiel non transactionnel et insuffisamment validé
`createShipment()` insère une expédition, insère les lignes et met à jour les articles en plusieurs opérations sans transaction. Il ne vérifie pas suffisamment que chaque `orderItemId` appartient à la commande, que la quantité est positive et non supérieure à la quantité commandée/non expédiée, ni qu'un item n'est pas déjà dans une autre expédition.

`updateItemStatus()` accepte une chaîne de statut et ne force pas les transitions autorisées.

**Correction obligatoire :** transaction unique, DTO avec enum, validation d'appartenance, contrôle de quantité restante, unicité logique shipment-item, transitions autorisées et verrouillage transactionnel.
## C5. Statut global de commande incohérent
`recalculateOrderStatus()` transforme certains cas mixtes en `confirmed`, `processing`, `shipped` ou `cancelled`, mais il faut définir la machine d'état métier complète : commande partiellement expédiée, article en anomalie, article annulé, livraison partielle et remboursement partiel.

**Correction obligatoire :** documenter la machine d'état, empêcher les transitions invalides, ajouter un statut global explicite `partially_shipped` ou une projection équivalente, et tester tous les tableaux de statuts multi-articles.
## C6. Numérotation des reçus non conforme à une séquence sûre
Le reçu actuel utilise principalement le numéro de commande préfixé (`REC-${orderNumber}`), pas une séquence transactionnelle garantie. La table `receiptSettings` contient des options de branding mais pas de compteur atomique démontré.

**Correction obligatoire :** compteur par boutique et exercice, verrouillage transactionnel (`SELECT ... FOR UPDATE` ou équivalent), contrainte unique sur le numéro, gestion des retries et politique de réémission sans nouveau numéro.
## C7. Reçu PDF incomplet
Le PDF généré contient principalement client, référence, date et total. Il ne contient pas un détail fiable des lignes, quantités, prix unitaires, remises, frais, taxe, mode de paiement et état de paiement.

**Correction obligatoire :** générer le PDF à partir d'un snapshot immuable des données de commande et paiement. Vérifier le rendu, les caractères accentués, les montants et les cas de longue liste d'articles.
## C8. Envoi de reçu non durable
Le PDF est écrit dans `uploads/receipts/` sur le filesystem du conteneur. Cela disparaît lors d'un redeploiement ou changement d'instance.

**Correction obligatoire :** stockage objet compatible S3/MinIO, URL signée à durée limitée, contrôle d'accès par client/admin et tâche de nettoyage. Ne pas exposer directement les uploads privés.
## C9. Messagerie et notifications non réellement temps réel
Les messages système sont ajoutés en base, mais l'audit ne montre pas une stratégie complète WebSocket/SSE/polling, push, retry, déduplication et traitement des tokens invalides.

**Correction obligatoire :** choisir WebSocket/SSE ou polling documenté, ajouter une queue pour push/email/SMS, clé d'événement idempotente et journal de livraison par canal.
## C10. Erreurs avalées dans les opérations métier critiques
La génération et l'envoi du reçu lors de `delivered` sont traités en best-effort avec `catch` silencieux. Cela évite de bloquer la livraison, mais masque un échec de conformité.

**Correction obligatoire :** enregistrer l'échec dans un journal/outbox, exposer l'état `receipt_pending/failed`, permettre une reprise admin et alerter l'équipe. Ne jamais perdre l'erreur.

* * *
# 3\. Plan de correction final pour Cursor
## Règles impératives
1. Lire ce document et le `CURSOR_MASTER_PLAN.md` avant toute modification.
2. Auditer le code réel avant d'éditer. Ne pas recopier aveuglément les extraits du plan.
3. Exécuter les phases dans l'ordre, sans déclarer une phase terminée tant que ses tests ne passent pas.
4. Toute modification de schéma doit inclure : schema Drizzle, migration SQL, journal Drizzle, seed si nécessaire et test de migration sur une base PostgreSQL propre.
5. Toute route doit avoir un DTO validé avec `ValidationPipe`, enum métier et contrôle d'autorisation.
6. Toute mutation commande/paiement/stock/fulfillment doit être transactionnelle et idempotente.
7. Aucun secret, token, mot de passe ou donnée carte dans le code, les logs ou Git.
8. Ne jamais utiliser `any` pour contourner une erreur de typage dans les domaines critiques.
9. Ne pas supprimer les tests ou désactiver les checks pour faire passer le build.
10. Ne faire aucun `git add`, `git commit` ou `git push`.
11. À chaque limite de contexte, mettre à jour un fichier local `CURSOR_PROGRESS.md` avec phase, fichiers, migrations, tests passés/échoués et prochaines actions, puis reprendre après relecture.
## Phase A — Paiement réel et cohérence financière
*   Créer l'abstraction `PaymentProvider`.
*   Ajouter table `payments` complète et contraintes de statut.
*   Implémenter init paiement, retour client et webhook signé.
*   Ajouter vérification de signature, replay protection, idempotency et journal des événements PSP.
*   Ne jamais accepter les montants calculés par le mobile.
*   Recalculer prix, stock, livraison, coupon et total dans une transaction serveur.
*   Ne vider le panier qu'après le résultat métier correct.
*   Ajouter tests unitaires, intégration et concurrence.

**Critère de sortie :** prix falsifié rejeté, double requête idempotente, webhook rejoué sans double capture, commande impayée non marquée payée.
## Phase B — Fulfillment robuste
*   Ajouter enums/constants de statuts.
*   Valider les transitions par item et commande.
*   Rendre création d'expédition transactionnelle.
*   Vérifier appartenance item/commande, quantité disponible, absence de doublon et magasin autorisé.
*   Ajouter `shipment_events` ou journal équivalent.
*   Supporter livraison partielle, incident, annulation partielle et remboursement partiel.
*   Corriger l'UI admin pour n'envoyer que les transitions autorisées et afficher les erreurs serveur.

**Critère de sortie :** deux administrateurs concurrents ne peuvent pas expédier deux fois la même quantité.
## Phase C — Reçus de production
*   Ajouter compteur séquentiel atomique par boutique et exercice.
*   Ajouter snapshot complet des items et paiement.
*   Générer PDF détaillé avec branding, mentions légales, devise, taxes et remise.
*   Ajouter stockage objet privé et URLs signées.
*   Créer l'interface admin reçus : liste, recherche, détail, aperçu/téléchargement, renvoi, génération manuelle, statut d'erreur et paramètres.
*   Créer l'accès client sécurisé dans l'application mobile.
*   Ajouter outbox/retry pour l'envoi email, push et message système.
*   Ajouter tests PDF et tests de concurrence de numérotation.

**Critère de sortie :** une livraison produit un reçu exactement une fois, réémissible sans changer son numéro, récupérable uniquement par les utilisateurs autorisés.
## Phase D — Messagerie et notifications fiables
*   Définir les rôles `customer/admin/system` et permissions.
*   Ajouter lecture/non-lu atomique, pagination et ordre stable.
*   Implémenter temps réel choisi et fallback polling.
*   Ajouter outbox et queue avec retry exponentiel, dead-letter et idempotency.
*   Enregistrer les push tokens par appareil, désactiver les tokens invalides et respecter les préférences.
*   Ajouter messages système pour confirmation, préparation, expédition, transit, livraison, incident, annulation, remboursement et reçu.
*   Ne pas générer de doublon lors d'un retry ou webhook répété.
## Phase E — Sécurité API et données
*   Activer `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
*   Ajouter rate limiting par IP, utilisateur, téléphone et route sensible.
*   Remplacer OTP par un hash du code, expiration, compteur d'essais, invalidation des anciens codes et suppression planifiée.
*   Vérifier tous les guards admin/client/public route par route.
*   Ajouter CORS explicite, headers sécurisés, limites upload, validation contenu et contrôle des fichiers.
*   Ajouter audit log pour actions admin sensibles.
*   Ajouter scan des dépendances et secrets dans CI.
## Phase F — Tests et qualité
Créer une vraie suite :
*   tests unitaires services commande, paiement, reçu, fulfillment et statut ;
*   tests API e2e avec PostgreSQL ;
*   tests de permissions ;
*   tests de concurrence stock, idempotency, expédition et numéro de reçu ;
*   tests mobile checkout, commandes, messages et rafraîchissement ;
*   tests admin fulfillment et reçus ;
*   test architecture `npm run check:arch`.

Aucun `npm test` ne doit être un simple placeholder. Les tests doivent échouer en cas de régression.
## Phase G — Observabilité et exploitation
*   Logs JSON corrélés par `requestId`, `orderId`, `paymentId`, `receiptId`.
*   Endpoint health séparant liveness et readiness, vérifiant PostgreSQL et dépendances critiques.
*   Métriques : erreurs 5xx, latence, commandes, paiements échoués, stock, notifications en échec, files d'attente.
*   Alertes et rapport d'erreurs sans PII sensible.
*   Backups PostgreSQL automatisés, test de restauration et politique de rétention.
*   Stockage uploads durable, rotation et restauration testée.
## Phase H — CI/CD et release gate
Modifier `.github/workflows/ci.yml` pour exécuter :
*   install reproductible ;
*   typecheck mobile/API/admin ;
*   lint mobile/API/admin ;
*   tests unitaires et e2e ;
*   check architecture ;
*   migration sur PostgreSQL de CI ;
*   audit `npm audit` ou équivalent ;
*   build Docker ;
*   vérification qu'aucun secret n'est commité.

Ajouter une checklist de release avec rollback, migration forward/backward-compatible, variables d'environnement, smoke tests et approbation manuelle avant production.

* * *
# 4\. Tests de validation obligatoires
## Commandes

```bash
npm run check:arch
npm run lint
npx tsc --noEmit
cd apps/api && npm run build
cd apps/admin && npm run build
npm test -- --run
```

Ajouter et exécuter, avec une base PostgreSQL de test :

```bash
cd apps/api && npm run test:e2e
```

## Scénarios métier
1. Prix modifié dans la requête : rejet ou total serveur correct.
2. Double clic checkout : une seule commande.
3. Deux requêtes concurrentes sur le dernier stock : une seule réussit.
4. Paiement webhook envoyé deux fois : une seule capture et un seul message.
5. Commande de cinq produits : trois expédiés, deux en incident, puis deux expédiés plus tard.
6. Même item soumis à deux expéditions : seconde requête refusée.
7. Livraison confirmée deux fois : un seul reçu, un seul numéro.
8. PDF avec plusieurs lignes, remise, frais et caractères accentués.
9. Client A ne peut pas télécharger le reçu du client B.
10. Admin sans permission ne peut pas générer, renvoyer ou modifier un reçu.
11. Message système généré une seule fois par transition.
12. OTP expiré, réutilisé ou dépassant cinq essais : refusé.
13. Upload non-image, trop volumineux ou privé : refusé.
14. Migration appliquée sur base vide puis sur base existante sans perte.
15. Health readiness échoue si PostgreSQL est indisponible.

* * *
# 5\. Définition de terminé
Le projet n'est **pas** conforme tant que chaque phase ci-dessus n'est pas accompagnée de :
*   code réellement présent ;
*   migration et seed validés ;
*   tests automatisés passants ;
*   preuve de build/lint/typecheck ;
*   preuve d'autorisation et d'idempotency ;
*   aucune erreur silencieuse sur les processus critiques ;
*   rapport des risques résiduels ;
*   validation manuelle des scénarios métier ;
*   aucune modification Git poussée par Cursor.

À la fin, produire `FINAL_PRODUCTION_READINESS_REPORT.md` avec une matrice PASS/FAIL, les commandes exécutées, les migrations appliquées, les risques restants et les étapes manuelles nécessaires. Ne jamais écrire “100% prêt” si un critère est seulement prévu mais non démontré.