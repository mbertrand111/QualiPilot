# Guide de développement — QualiPilot

---

## Démarrage rapide

```bash
cp .env.example .env
# Remplir ADO_PAT, ADO_ORG, ADO_PROJECT dans .env
npm run setup
npm run dev
```

- Frontend : http://localhost:5173
- Backend  : http://localhost:3001/api/health

---

## Utiliser Claude Code

```bash
# Depuis la racine du repo
claude
```

Claude Code lit automatiquement `CLAUDE.md` et connaît la stack, le modèle de données, les règles métier et les conventions.

### Slash commands disponibles

| Commande | Quand l'utiliser |
|----------|-----------------|
| `/project:feature-dev` | Développer une feature complète (back + front + tests) |
| `/project:add-api-route` | Juste une route Express + test |
| `/project:add-react-page` | Juste une page React |
| `/project:systematic-debugging` | Bug ou test en échec |
| `/project:test-driven-development` | Écrire les tests avant le code |
| `/project:frontend-design` | Travailler le design d'une page |

---

## Ajouter une feature

**Backend** — `backend/src/routes/index.ts` :
```typescript
import myFeatureRouter from './myFeature';
router.use('/', myFeatureRouter);
```

**Frontend** — `frontend/src/routes.ts` :
```typescript
{ path: '/my-feature', label: 'Ma feature', component: lazy(() => import('./pages/MyFeature')) },
```

---

## Commandes utiles

```bash
npm run setup       # installer toutes les dépendances
npm run dev         # lancer backend:3001 + frontend:5173
npm run test        # tous les tests Vitest
npm run lint        # vérification TypeScript
npm run build       # build production
npm run clean       # tout supprimer

# Tester le backend directement
curl localhost:3001/api/health
curl -X POST localhost:3001/api/sync
curl localhost:3001/api/conformity/violations
```

---

## En cas de problème

| Problème | Solution |
|----------|---------|
| Port déjà utilisé | Changer `PORT_BACKEND` ou `PORT_FRONTEND` dans `.env` |
| Erreur TypeScript | `npm run lint` pour le détail |
| Test qui échoue | `npm --prefix backend test -- --reporter=verbose` |
| ADO 401 Unauthorized | Vérifier `ADO_PAT` dans `.env` — token peut être expiré |
| ADO 403 Forbidden | Vérifier les scopes du PAT (Work Items Read & Write requis) |
| Claude Code ne lit pas CLAUDE.md | Lancer `claude` depuis la racine du repo |
