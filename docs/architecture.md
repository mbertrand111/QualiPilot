# Architecture — QualiPilot

Monorepo — deux packages : `backend/` et `frontend/`.

## Backend — Express.js + TypeScript + SQLite

```
backend/src/
├── index.ts                    ← Bootstrap serveur — ne pas modifier
├── config/index.ts             ← Variables d'environnement centralisées
├── db/
│   ├── index.ts                ← Connexion SQLite + migrations au démarrage
│   └── schema.sql              ← Définition des tables
├── routes/
│   ├── index.ts                ← Registre des routes
│   ├── bugs.ts                 ← GET /api/bugs
│   ├── conformity.ts           ← GET /api/conformity/violations
│   ├── kpis.ts                 ← GET /api/kpis
│   ├── stats.ts                ← GET /api/stats/*
│   ├── teams.ts                ← GET /api/teams
│   ├── rules.ts                ← GET/PUT /api/rules
│   ├── write.ts                ← PATCH /api/write (écritures ADO)
│   └── sync.ts                 ← POST /api/sync
└── services/
    ├── azureDevOps.ts          ← Couche ADO : appels REST + WIQL
    ├── sync.ts                 ← Orchestration sync
    ├── conformity.ts           ← Moteur d'évaluation des règles
    ├── kpi.ts                  ← Calculs indicateurs qualité
    └── scheduler.ts            ← Cron jobs (snapshots automatiques)
```

Port : `3001` (env var `PORT_BACKEND`)

## Frontend — React + Vite + TypeScript + React Router + Tailwind

```
frontend/src/
├── main.tsx / App.tsx          ← Points d'entrée — ne pas modifier
├── routes.ts                   ← Registre des pages
├── api/client.ts               ← Wrapper fetch partagé — ne pas modifier
├── components/                 ← Composants UI réutilisables
└── pages/
    ├── Home.tsx                ← Dashboard résumé
    ├── Conformity.tsx          ← Liste anomalies
    ├── ConformityDetail.tsx    ← Détail bug + actions
    ├── BugList.tsx             ← Liste bugs filtrables
    ├── Kpis.tsx                ← Indicateurs qualité
    ├── History.tsx             ← Historique snapshots + suivi corrections manuelles
    └── Settings.tsx            ← Paramétrage
```

Port : `5173` (env var `PORT_FRONTEND`)
Vite proxy `/api/*` → `http://localhost:3001` — ne jamais appeler `localhost:3001` directement depuis le frontend.

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
`backend/src/routes/` · `backend/src/services/` · `backend/src/db/` · `backend/src/config/`
`frontend/src/pages/` · `frontend/src/components/` · `frontend/src/routes.ts`

## Nommage des fichiers

| Type | Chemin |
|------|--------|
| Route backend | `backend/src/routes/<feature>.ts` |
| Test route | `backend/src/routes/<feature>.test.ts` |
| Service | `backend/src/services/<name>.ts` |
| Page React | `frontend/src/pages/<Feature>.tsx` |
| Composant | `frontend/src/components/<Component>.tsx` |
