# Stratégie de tests QualiPilot

Ce document formalise la couverture minimale attendue : TU, TI et e2e.

## Objectifs

- Protéger les règles métier de conformité.
- Sécuriser les écritures Azure DevOps.
- Garantir les parcours UI critiques sans régression visible.

## Pyramide de tests

- **TU (tests unitaires)** : fonctions métier pures et helpers.
  - Exemples : règles de conformité, classifieur de bugs, middleware sécurité.
- **TI (tests d'intégration)** : routes backend via `supertest` avec mocks.
  - Exemples : `write`, `sync`, `conformity`, `bugs`, `health`.
- **e2e (Playwright)** : validation de pages front avec API mockée.
  - Exemples : dashboard, anomalies, navigation de base.

## Commandes

- `npm run test` : TU + TI (backend + frontend Vitest).
- `npm run test:e2e` : tests Playwright frontend.
- `npm run lint` : vérification TypeScript stricte.

## Cas obligatoires à couvrir

- **Conformité**
  - Détection des violations principales.
  - Non-régression sur les formats versions/builds.
- **Writes ADO**
  - Validation d'inputs.
  - Rejets des champs non autorisés.
  - Erreurs ADO transformées en erreurs API cohérentes.
- **Sécurité**
  - Routes sensibles protégées quand `QUALIPILOT_WRITE_API_KEY` est défini.
- **UI**
  - Dashboard charge et affiche les KPI.
  - Page anomalies affiche les violations et la navigation reste fonctionnelle.

## Bonnes pratiques

- Un test doit vérifier un comportement métier explicite.
- Préférer des fixtures minimales et lisibles.
- Pour le e2e, mocker les endpoints `/api/*` pour éviter la dépendance ADO.
