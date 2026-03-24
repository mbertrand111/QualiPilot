# Feature 5 : KPI & Historique

**Moment dans le parcours :** Étape 4 — elle suit l'évolution dans le temps via les dashboards KPI

---

## Spec fonctionnelle

| | |
|---|---|
| **Input utilisateur** | Navigation vers la page KPIs + filtres (PI, équipe, produit) |
| **Ce que l'app affiche** | Graphiques d'évolution + tableau des snapshots historiques |
| **Output** | Tendances qualité : est-ce qu'on s'améliore ou on décroche ? |

---

## KPIs affichés

### Defect Debt
- Nb de bugs ouverts par équipe au fil du temps
- Vue par PI / par sprint
- Objectif : voir si la dette diminue ou augmente

### Évolution backlog
- Courbe : bugs créés vs bugs fermés par période
- Filtre par produit (Live / Historique)

### Répartition bugs fermés
- Par équipe et par PI
- Par produit (Live vs Historique)

### Vue sprint en cours
- Pour chaque équipe : nb bugs ouverts vs objectif max
- Indicator vert/rouge selon l'objectif

---

## Snapshots automatiques

- Cron job hebdomadaire (configurable) → calcule les KPIs du moment
- Stocke dans `kpi_snapshots` (team_id, sprint_name, pi_name, open_bugs, created/closed this period, violations_count)
- La page Historique affiche les snapshots passés sous forme de tableau

---

## États UI

- **Chargement** : skeleton sur les graphiques
- **Données** : graphiques + tableau snapshots
- **Aucun snapshot** : message "Aucun historique disponible — le premier snapshot sera généré automatiquement"
- **Erreur** : message d'erreur discret

---

## Contrat technique

- **Routes backend** :
  - `GET /api/kpis` → KPIs calculés en temps réel depuis le cache
  - `GET /api/kpis/snapshots` → historique des snapshots
  - `GET /api/kpis/snapshots?team=X&pi=Y` → filtrés
- **Pages frontend** :
  - `frontend/src/pages/Kpis.tsx` (dashboards)
  - `frontend/src/pages/History.tsx` (historique snapshots)
- **Service** : `backend/src/services/kpi.ts` + `backend/src/services/scheduler.ts`
- **Graphiques** : recharts ou chart.js (à choisir au moment du dev)

---

## Starter prompt Claude Code

```
/project:feature-dev

Je veux implémenter la feature "KPI & Historique" (Feature 5 du MVP QualiPilot).

Service kpi.ts : calcule depuis bugs_cache les métriques clés (bugs ouverts par équipe,
créés/fermés sur la période, violations actives). Supporte filtres team, pi_name, sprint_name.

Service scheduler.ts : cron hebdomadaire (node-cron) qui appelle kpi.ts et insère un snapshot
dans kpi_snapshots pour chaque équipe active.

Route GET /api/kpis : retourne les KPIs temps réel.
Route GET /api/kpis/snapshots : retourne l'historique avec filtres optionnels team/pi.

Page Kpis.tsx : graphiques (defect debt, évolution backlog, répartition bugs fermés).
Page History.tsx : tableau des snapshots passés avec filtres.
Utiliser recharts pour les graphiques. Tailwind pour le style.

Tests : calculs kpi avec données de test, cron déclenche bien un snapshot, routes avec filtres.
```
