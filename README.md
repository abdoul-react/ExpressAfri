# ExpressAfri

## Convention d'architecture

Pour préserver la séparation des responsabilités, chaque ajout doit respecter les règles suivantes :

- Les écrans doivent rester présents et ne pas importer directement les mocks de données.
- Les services doivent rester purs : récupération, mapping et normalisation uniquement.
- Les transformations de données doivent vivre dans les hooks ou dans des helpers dédiés.
- Les nouveaux domaines doivent avoir leur propre service et, si nécessaire, leur propre hook.
- La dépendance doit toujours suivre ce flux : écran -> hook -> service -> données.

### Vérification

Exécuter :

```bash
npm run check:arch
```

Ce script vérifie qu’aucun écran ou hook ne réimporte directement des données depuis la couche data.
