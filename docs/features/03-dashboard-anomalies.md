# Feature 3 : Dashboard + Liste anomalies

**Moment dans le parcours :** Étapes 1 & 2 — elle ouvre QualiPilot, voit l'état de santé, consulte les anomalies

---

## Spec fonctionnelle

| | |
|---|---|
| **Input utilisateur** | Arrivée sur l'app + filtres optionnels (équipe, règle, sévérité) |
| **Ce que l'app affiche** | Dashboard résumé + liste filtrée des anomalies de conformité |
| **Output** | Vue actionnable : quels bugs posent problème, pour quelle équipe, quelle règle |

---

## Page Home (Dashboard)

Résumé de l'état qualité du jour :

- **Nb total de bugs en cache** (avec timestamp dernière sync)
- **Nb d'anomalies actives** (errors vs warnings)
- **Répartition par équipe** — mini-tableau ou barchart
- **Bouton "Synchroniser"** — déclenche POST /api/sync
- **Dernière sync** — date/heure + statut

---

## Page Conformité (liste)

- Tableau des violations : bug ID, titre, équipe, règle violée, sévérité, date détection
- **Filtres** : par équipe (8 équipes), par règle (6 règles), par sévérité (error/warning)
- **Tri** : par équipe, par règle, par date
- **Clic sur une ligne** → navigue vers la page Détail bug (Feature 4)
- Badge couleur sur la sévérité : rouge = error, orange = warning

---

## États UI

- **Chargement** : skeleton loaders sur les cards et le tableau
- **Données** : dashboard rempli + tableau paginé
- **Aucune anomalie** : message positif "Aucune anomalie détectée" (état idéal à célébrer ✓)
- **Pas encore synchronisé** : invitation à lancer la première sync

---

## Contrat technique

- **Routes** :
  - `GET /api/kpis` → données résumé pour le dashboard
  - `GET /api/conformity/violations?team=X&rule=Y&severity=Z` → liste filtrée
  - `GET /api/teams` → liste des équipes pour les filtres
- **Pages frontend** :
  - `frontend/src/pages/Home.tsx` (dashboard)
  - `frontend/src/pages/Conformity.tsx` (liste violations)
- **Composants** : `FilterBar.tsx`, `Badge.tsx`, `Card.tsx`

---

## Starter prompt Claude Code

```
/project:feature-dev

Je veux implémenter la feature "Dashboard + Liste anomalies" (Feature 3 du MVP QualiPilot).

Page Home.tsx : dashboard résumé avec cards KPI (nb bugs total, nb anomalies errors/warnings,
dernière sync), mini-tableau répartition par équipe, bouton "Synchroniser" (POST /api/sync).

Page Conformity.tsx : tableau des violations avec colonnes (ID bug, titre, équipe, règle, sévérité,
date). Filtres par équipe / règle / sévérité via FilterBar. Tri. Pagination.
Clic sur une ligne → navigate vers /conformity/:bugId.
Badge rouge pour error, orange pour warning.

Style : minimaliste sérieux mais moderne et accueillant, Tailwind CSS, bleu #1E40AF accent #3B82F6.
Skeleton loaders pendant le chargement. Message positif si 0 anomalie.

Tests : rendu avec données mockées, filtres fonctionnels, état vide.
```
