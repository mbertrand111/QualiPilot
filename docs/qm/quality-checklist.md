# Quality Checklist — QualiPilot

---

## Definition of Done

Une feature est **Done** quand toutes les cases suivantes sont cochées :

### Code
- [ ] Le code compile sans erreur TypeScript (`npm run lint`)
- [ ] Aucun `console.log` oublié (utiliser le logger pino)
- [ ] Pas de valeur hardcodée — tout passe par `config/` ou `.env`
- [ ] Le commit est descriptif et atomique

### Tests
- [ ] Au moins 1 test couvre le **happy path**
- [ ] Au moins 1 test couvre un **cas d'erreur** (erreur ADO, input invalide, DB KO)
- [ ] Les cas limites métier sont couverts (ex: 0 bugs, champ null, violation résolue)
- [ ] `npm run test` passe à **100% vert** — aucun test existant ne régresse

### Backend
- [ ] Les requêtes SQL utilisent des **paramètres nommés** (jamais de concaténation)
- [ ] Les inputs sont validés avec **Zod** sur chaque POST/PUT
- [ ] La route répond avec le bon format JSON et le bon code HTTP
- [ ] Les erreurs ADO (401, 403, timeout) retournent un message clair sans stack trace

### Frontend
- [ ] L'interface affiche le résultat sans erreur console
- [ ] Les états **loading / succès / erreur** sont tous gérés et visibles
- [ ] Aucun appel direct à `localhost:3001` — tout passe par le proxy Vite (`/api/...`)

### Sécurité (obligatoire pour toute route write ADO)
- [ ] La whitelist des champs modifiables est vérifiée **côté backend**, jamais côté frontend
- [ ] Chaque écriture ADO est tracée dans `ado_write_audit` (work_item_id, field, old_value, new_value)
- [ ] Une **confirmation explicite** de l'utilisateur est demandée avant toute écriture ADO

---

## Automatisation des tests — mode CI local

Les tests de **toutes les features** tournent ensemble à chaque `npm run test`. Quand tu travailles sur Feature 3, les tests Feature 1 et Feature 2 s'exécutent aussi — si tu introduis une régression, tu le vois immédiatement.

### Lancer tous les tests
```bash
npm run test
```

### Mode watch (recommandé pendant le développement)
Relance toute la suite à chaque modification de fichier :
```bash
npm run test:watch
```

### Tests avec couverture
```bash
npm run test:coverage
```

### Tests d'un sous-projet uniquement
```bash
npm --prefix backend test
npm --prefix frontend test
```

---

## Checklist sécurité

| Risque | Mitigation en place |
|--------|---------------------|
| **SQL Injection** | Requêtes paramétrées `better-sqlite3` — zéro concaténation, vérifié en DoD |
| **XSS** | React échappe automatiquement — `dangerouslySetInnerHTML` interdit |
| **Secrets dans le code** | `.env` exclu du git (`.gitignore`), jamais de PAT hardcodé |
| **Écriture ADO non autorisée** | Whitelist stricte dans config backend, audit log obligatoire, confirmation UI |
| **Validation des inputs** | Zod sur chaque POST/PUT — valeurs inattendues rejetées avec 400 |
| **Auth ADO exposée** | PAT côté backend uniquement, jamais envoyé au frontend |
| **CSRF** | Pas de cookie/session — non applicable (PAT Bearer backend only) |
| **Élévation de privilèges** | Un seul utilisateur (QM) — pas de gestion de rôles à sécuriser |

---

## Vérification des champs custom ADO

Après le premier sync réel, vérifier que les champs custom sont bien mappés :

```bash
# 1. Lancer un sync
curl -X POST http://localhost:3001/api/sync

# 2. Inspecter le raw_json d'un bug pour trouver les vraies refs
# Utilise DB Browser for SQLite ou sqlite3 en ligne de commande :
sqlite3 backend/qualipilot.db "SELECT id, raw_json FROM bugs_cache LIMIT 1" | python -m json.tool

# 3. Si les refs custom sont incorrectes, corriger dans :
#    backend/src/services/azureDevOps.ts — constante CUSTOM_FIELD_REFS
```

Champs à vérifier : `Custom.VersionSouhaiteeGC`, `Custom.ResolvedReasonCustom`, `Custom.Equipe`, `Custom.Filiere`.
Si `team` et `version_souhaitee` sont `null` dans la DB après sync → les refs sont à corriger.
