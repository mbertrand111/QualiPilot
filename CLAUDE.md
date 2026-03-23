# CLAUDE.md — QualiPilot

Ce fichier est lu automatiquement par Claude Code comme contexte du projet.

---

## Project Overview

```
Project Name  : QualiPilot
Problem       : Le pilotage qualité repose aujourd'hui sur plusieurs outils disparates
                (Azure DevOps, Power BI, suivi manuel), sans vue unifiée ni actions directes.
Target Users  : Quality Manager interne (usage solo dans un premier temps)
Objective     : Application web interne centralisant contrôles de conformité des bugs,
                dashboards qualité, historisation automatique des indicateurs,
                et actions correctives directes sur Azure DevOps.
```

---

## Contexte métier

### Produits / versions suivis

| Type | Nom interne | Nom affiché UI | Format version |
|------|------------|----------------|----------------|
| Produit hébergé | `fah` | **Live** | `FAH_xx.yy` (ex: FAH_26.20) |
| Produit on-premise | `onpremise` | **Historique** | `13.87.xxx` |

### Équipes (8 équipes actives)
COCO · GO FAHST · JURASSIC BACK · MAGIC SYSTEM · MELI MELO · NULL.REF · PIXELS · LACE

### Zones spéciales Azure DevOps (Area Path, pas des équipes)
- **Bugs à corriger** — bugs planifiés pour correction
- **Bugs à prioriser** — bugs en attente de priorisation
- **Hors production** — bugs non applicatifs / indépendants d'une version
- Maintenance · Performance · Sécurité · QuestionsSL

### Structure Iterations (ADO)
Projet ADO : `Isagri_Dev_GC_GestionCommerciale`
Format : `{projet}\{année-année}\PI{n}\PI{n}-SP{m}`
Exemple : `Isagri_Dev_GC_GestionCommerciale\2025-2026\PI1\PI1-SP1`
Chaque PI = 4 sprints de 2 semaines + 1 sprint IP de 1 semaine.

### Champs ADO utilisés

| Nom affiché | Référence ADO | Type |
|-------------|---------------|------|
| Work Item Type | `System.WorkItemType` | Standard |
| State | `System.State` | Standard |
| Priority | `Microsoft.VSTS.Common.Priority` | Standard |
| Integration Build | `Microsoft.VSTS.Build.IntegrationBuild` | Standard |
| Found In | `Microsoft.VSTS.Build.FoundIn` | Standard |
| Area Path | `System.AreaPath` | Standard |
| Iteration Path | `System.IterationPath` | Standard |
| Assigned To | `System.AssignedTo` | Standard |
| Version souhaitée GC | à confirmer — champ custom | Custom |
| Resolved Reason Custom | à confirmer — champ custom | Custom |
| Equipe | à confirmer — champ custom | Custom |
| Filière | à confirmer — champ custom | Custom |

---

## Architecture

Monorepo — deux packages : `backend/` et `frontend/`.

---

### Backend — Express.js + TypeScript + SQLite

```
backend/src/
├── index.ts                    ← Bootstrap serveur — ne pas modifier
├── config/
│   └── index.ts                ← Centralisation des variables d'environnement
├── db/
│   ├── index.ts                ← Connexion SQLite + migrations au démarrage
│   └── schema.sql              ← Définition des tables QualiPilot
├── routes/
│   ├── index.ts                ← Registre des routes
│   ├── health.ts               ← GET /api/health
│   ├── bugs.ts                 ← GET /api/bugs (lecture cache local)
│   ├── conformity.ts           ← GET /api/conformity/violations
│   ├── kpis.ts                 ← GET /api/kpis + historique
│   ├── teams.ts                ← GET /api/teams
│   ├── rules.ts                ← GET/PUT /api/rules (règles de conformité)
│   └── sync.ts                 ← POST /api/sync (déclencher sync ADO)
└── services/
    ├── azureDevOps.ts          ← Couche ADO : appels REST + WIQL
    ├── sync.ts                 ← Orchestration sync (fetch ADO → cache local)
    ├── conformity.ts           ← Moteur d'évaluation des règles
    ├── kpi.ts                  ← Calculs indicateurs qualité
    └── scheduler.ts            ← Cron jobs (snapshots automatiques)
```

Port : `3001` (env var `PORT_BACKEND`)

---

### Frontend — React + Vite + TypeScript + React Router + Tailwind CSS

```
frontend/src/
├── main.tsx                    ← Point d'entrée — ne pas modifier
├── App.tsx                     ← Shell router — ne pas modifier
├── routes.ts                   ← Registre des pages
├── api/
│   └── client.ts               ← Wrapper fetch partagé — ne pas modifier
├── components/                 ← Composants UI réutilisables
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── FilterBar.tsx
│   └── ...
└── pages/
    ├── Home.tsx                ← Dashboard résumé (page d'accueil)
    ├── Conformity.tsx          ← Liste des violations de conformité
    ├── ConformityDetail.tsx    ← Détail d'un bug + actions
    ├── BugList.tsx             ← Liste bugs filtrables
    ├── Kpis.tsx                ← Dashboards indicateurs qualité
    ├── History.tsx             ← Historique des snapshots
    └── Settings.tsx            ← Paramétrage (équipes, règles, connexion ADO)
```

Port : `5173` (env var `PORT_FRONTEND`)
Vite proxy `/api/*` → `http://localhost:3001` — ne jamais appeler `localhost:3001` directement depuis le frontend.

---

## Modèle de données (SQLite)

```sql
-- Équipes (référence configurable)
CREATE TABLE teams (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  ado_area  TEXT,
  active    INTEGER DEFAULT 1
);

-- Objectifs par équipe et sprint
CREATE TABLE team_sprint_objectives (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id     INTEGER REFERENCES teams(id),
  sprint_name TEXT NOT NULL,
  pi_name     TEXT,
  max_bugs    INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Règles de conformité (moteur de règles)
CREATE TABLE conformity_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK(severity IN ('error', 'warning')),
  active      INTEGER DEFAULT 1,
  rule_config TEXT NOT NULL  -- JSON : logique de la règle
);

-- Cache des bugs synchronisés depuis ADO
CREATE TABLE bugs_cache (
  id                INTEGER PRIMARY KEY,  -- = ADO Work Item ID
  title             TEXT,
  state             TEXT,
  priority          INTEGER,
  area_path         TEXT,
  iteration_path    TEXT,
  assigned_to       TEXT,
  team              TEXT,
  filiere           TEXT,
  created_date      TEXT,
  resolved_date     TEXT,
  changed_date      TEXT,
  found_in          TEXT,
  integration_build TEXT,
  version_souhaitee TEXT,
  resolved_reason   TEXT,
  raw_json          TEXT,  -- JSON complet du work item (flexibilité maximale)
  last_synced_at    TEXT DEFAULT (datetime('now'))
);

-- Violations de conformité détectées
CREATE TABLE conformity_violations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id      INTEGER REFERENCES bugs_cache(id),
  rule_id     INTEGER REFERENCES conformity_rules(id),
  detected_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  UNIQUE(bug_id, rule_id)
);

-- Snapshots KPI (historisation automatique hebdomadaire)
CREATE TABLE kpi_snapshots (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date         TEXT NOT NULL,
  team_id               INTEGER REFERENCES teams(id),
  sprint_name           TEXT,
  pi_name               TEXT,
  open_bugs             INTEGER,
  created_this_period   INTEGER,
  closed_this_period    INTEGER,
  violations_count      INTEGER,
  created_at            TEXT DEFAULT (datetime('now'))
);

-- Audit des écritures Azure DevOps
CREATE TABLE ado_write_audit (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id  INTEGER NOT NULL,
  field         TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  performed_at  TEXT DEFAULT (datetime('now'))
);
```

---

## Règles de conformité implémentées

### PRIORITY_CHECK
Tous les bugs doivent être en priorité 2.
- Champ : `Priority`
- Violation si : `Priority <> 2`

### VERSION_SOUHAITEE_CHECK
La "Version souhaitée GC" doit correspondre à un format valide.
- Formats valides : contient `FAH_` · `Outil Jbeg` · `Sonarqube` · `Isasite` · `Isacuve Web` · `git` · `12.` · `13.8` · `14.` · `-` · `Non concerné`
- Ciblé sur les bugs actifs uniquement

### INTEGRATION_BUILD_REQUIRED
Les bugs fermés (Closed/Resolved) modifiés récemment doivent avoir un Integration Build valide.
- La liste des builds valides évolue à chaque release — stockée en configuration JSON
- Valeurs spéciales acceptées : `Isasite` · `Outil Jbeg` · `Isacuve Web` · `-` · `/` · `Non concerné`

### INTEGRATION_BUILD_NOT_EMPTIED
Les bugs actifs (non Closed/Resolved) ne doivent pas avoir un Integration Build renseigné.
- Violation si : `State <> Closed AND State <> Resolved AND Integration Build <> ''`

### CLOSED_BUG_COHERENCE
Un bug fermé avec motif autre que "Corrigé" ou "Réalisé" ne doit pas avoir de Version souhaitée ou Integration Build renseigné (hors `-`).

### FAH_VERSION_REQUIRED
Les bugs trouvés sur versions FAH récentes (`Found In > 17`) doivent avoir une Version souhaitée GC contenant `FAH`.
- Exceptions : `-` · `Non concerné` · `Isasite` · `Outil Jbeg` · `git` · `Isacuve Web` · `Migration`

---

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run setup` | Installe toutes les dépendances |
| `npm run dev` | Lance backend + frontend en parallèle |
| `npm run test` | Lance tous les tests (backend + frontend) |
| `npm run build` | Build de production |
| `npm run lint` | Vérifie les types TypeScript |
| `npm run clean` | Supprime node_modules et artefacts |

---

## Variables d'environnement requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PORT_BACKEND` | Port backend | `3001` |
| `PORT_FRONTEND` | Port frontend | `5173` |
| `DATABASE_PATH` | Chemin SQLite | `./qualipilot.db` |
| `ADO_PAT` | Personal Access Token Azure DevOps | `xxxxx` |
| `ADO_ORG` | Organisation ADO | `isagri` |
| `ADO_PROJECT` | Projet ADO | `Isagri_Dev_GC_GestionCommerciale` |
| `ADO_BASE_URL` | URL de base ADO | `https://dev.azure.com` |

---

## Règles de code

- **TypeScript strict** — pas de `any`
- Chaque endpoint API doit avoir au moins un test Vitest (happy path + cas d'erreur)
- Variables d'environnement via `.env` uniquement — jamais en dur dans le code
- `async/await` uniquement — pas de `.then()` bruts
- Réponses d'erreur : `{ error: string }` avec le bon code HTTP
- **Requêtes SQL paramétrées obligatoires** — zéro concaténation de chaînes dans les requêtes
- Validation des inputs sur chaque POST/PUT (Zod)
- Pas de `console.log` en production — utiliser le logger structuré (pino)
- **Champs ADO modifiables depuis l'appli** : whitelist stricte dans config, jamais contrôlée côté frontend
- **Chaque write ADO** nécessite une confirmation explicite de l'utilisateur et est tracé dans `ado_write_audit`
- **Sécurité first** : toutes les routes write ADO passent par validation + audit, sans exception

### Nommage des fichiers

| Type | Chemin |
|------|--------|
| Route backend | `backend/src/routes/<feature>.ts` |
| Test route | `backend/src/routes/<feature>.test.ts` |
| Service | `backend/src/services/<name>.ts` |
| Page React | `frontend/src/pages/<Feature>.tsx` |
| Composant | `frontend/src/components/<Component>.tsx` |

### Vocabulaire (code en anglais, UI en français)

| Concept | Code (EN) | Affichage UI (FR) |
|---------|-----------|-------------------|
| Produit FAH | `fah` / `live` | Live |
| Produit historique | `onpremise` / `historical` | Historique |
| Violation de conformité | `violation` | Anomalie |
| Snapshot KPI | `snapshot` | Instantané |
| Conformity rule | `conformity_rule` | Règle de conformité |
| Sync ADO | `sync` | Synchronisation |

---

## Design

- Couleurs primaires : bleu foncé (`#1E40AF`) + accent bleu (`#3B82F6`)
- Statuts : vert (`#16A34A`) bon · rouge (`#DC2626`) anomalie · orange (`#D97706`) avertissement
- Style : moderne, épuré, professionnel — orienté outil analytique interne
- Mobile-first, accessible (WCAG AA)
- Tailwind CSS uniquement — pas de CSS inline ni de fichiers `.css` custom

---

## Fichiers à ne jamais modifier

| Fichier | Pourquoi |
|---------|---------|
| `backend/src/index.ts` | Bootstrap serveur |
| `frontend/src/App.tsx` | Shell router |
| `frontend/src/api/client.ts` | Wrapper fetch partagé |
| `frontend/src/main.tsx` | Point d'entrée React |
| `backend/tsconfig.json` | Config TypeScript |
| `frontend/tsconfig.json` | Config TypeScript |
| `frontend/vite.config.ts` | Config build + proxy |

**Libres de création et modification :**
- `backend/src/routes/<feature>.ts` ✅
- `backend/src/routes/<feature>.test.ts` ✅
- `backend/src/routes/index.ts` ✅
- `backend/src/db/` ✅
- `backend/src/services/<service>.ts` ✅
- `backend/src/config/` ✅
- `frontend/src/pages/<Feature>.tsx` ✅
- `frontend/src/components/<Component>.tsx` ✅
- `frontend/src/routes.ts` ✅
