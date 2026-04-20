# Règles de code — QualiPilot

## TypeScript

- **Strict** — pas de `any`
- `async/await` uniquement — pas de `.then()` bruts
- Réponses d'erreur : `{ error: string }` avec le bon code HTTP
- Variables d'environnement via `.env` uniquement — jamais en dur dans le code

## API & Sécurité

- **SQL paramétré obligatoire** — zéro concaténation de chaînes dans les requêtes
- Validation Zod sur chaque POST/PUT
- Pas de `console.log` en production — logger structuré (pino)
- Whitelist stricte des champs ADO modifiables (côté config, jamais contrôlée côté frontend)
- **Chaque write ADO** : confirmation explicite + tracé dans `ado_write_audit`, sans exception

## Tests

- Chaque endpoint API doit avoir au moins un test Vitest (happy path + cas d'erreur)
- Framework : Vitest (`pool: 'threads'`)
- Tests e2e : Playwright

## Vocabulaire (code en anglais, UI en français)

| Concept | Code (EN) | Affichage UI (FR) |
|---------|-----------|-------------------|
| Produit FAH | `fah` / `live` | Live |
| Produit historique | `onpremise` / `historical` | Historique |
| Violation de conformité | `violation` | Anomalie |
| Snapshot KPI | `snapshot` | Instantané |
| Conformity rule | `conformity_rule` | Règle de conformité |
| Sync ADO | `sync` | Synchronisation |

## Variables d'environnement

| Variable | Exemple |
|----------|---------|
| `PORT_BACKEND` | `3001` |
| `PORT_FRONTEND` | `5173` |
| `DATABASE_PATH` | `./qualipilot.db` |
| `ADO_PAT` | Personal Access Token Azure DevOps |
| `ADO_ORG` | `isagri` |
| `ADO_PROJECT` | `Isagri_Dev_GC_GestionCommerciale` |
| `ADO_BASE_URL` | `https://dev.azure.com` |
| `QUALIPILOT_WRITE_API_KEY` | Clé API pour protéger les routes write |

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run setup` | Installe toutes les dépendances |
| `npm run dev` | Lance backend + frontend en parallèle |
| `npm run test` | Lance tous les tests |
| `npm run build` | Build de production |
| `npm run lint` | Vérifie les types TypeScript |
| `npm run clean` | Supprime node_modules et artefacts |
