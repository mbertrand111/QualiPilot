# QualiPilot

Outil de pilotage qualité interne — centralise contrôles de conformité, dashboards, historisation et actions directes sur Azure DevOps.

Stack : **Express.js + TypeScript + SQLite** (backend) · **React + Vite + TypeScript + Tailwind CSS** (frontend) · Monorepo npm.

---

## Quickstart

```bash
cp .env.example .env
# Remplir ADO_PAT, ADO_ORG, ADO_PROJECT dans .env
npm run setup && npm run dev
```

- Frontend : http://localhost:5173
- Backend  : http://localhost:3001/api/health

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |

---

## Configuration Azure DevOps

1. Créer un **Personal Access Token (PAT)** dans Azure DevOps :
   - Aller sur `https://dev.azure.com/{org}` → User Settings → Personal Access Tokens
   - Scopes requis : **Work Items (Read & Write)**
   - Durée : selon politique interne (1 an recommandé)
2. Renseigner dans `.env` :
   ```
   ADO_PAT=votre_token
   ADO_ORG=votre_organisation
   ADO_PROJECT=Isagri_Dev_GC_GestionCommerciale
   ```

---

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run setup` | Installe toutes les dépendances |
| `npm run dev` | Lance backend + frontend en parallèle |
| `npm run test` | Lance tous les tests |
| `npm run test:e2e` | Lance les tests end-to-end Playwright |
| `npm run build` | Build de production |
| `npm run lint` | Vérifie les types TypeScript |
| `npm run clean` | Supprime node_modules et artefacts |

---

## Variables d'environnement

Le fichier `.env.example` contient la liste complète. Variables clés :

- `PORT_BACKEND`, `PORT_FRONTEND`, `DATABASE_PATH`
- `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT`, `ADO_BASE_URL`
- `QUALIPILOT_WRITE_API_KEY` (optionnel mais recommandé) : active une protection par clé API sur les routes d'écriture (`POST`/`PATCH` sensibles).  
  Si vide, le comportement reste backward-compatible (pas de blocage).

---

## Structure du projet

```
.
├── CLAUDE.md                    ← Contexte Claude Code + règles métier
├── .env.example                 ← Variables d'environnement à copier
├── backend/
│   └── src/
│       ├── index.ts             ← Serveur Express (ne pas modifier)
│       ├── config/              ← Variables d'environnement centralisées
│       ├── db/                  ← SQLite : connexion + schema
│       ├── routes/              ← Endpoints API
│       └── services/            ← Logique métier (ADO, conformité, KPI)
├── frontend/
│   └── src/
│       ├── App.tsx              ← Shell React Router (ne pas modifier)
│       ├── routes.ts            ← Registre des pages
│       ├── components/          ← Composants UI réutilisables
│       ├── pages/               ← Pages de l'application
│       └── api/
│           └── client.ts        ← Wrapper fetch (ne pas modifier)
└── docs/
    ├── pm/                      ← Canvas produit, backlog
    ├── archi/                   ← Décisions d'architecture (ADR)
    └── features/                ← Spécifications features
```
