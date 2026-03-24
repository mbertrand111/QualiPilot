# Project Canvas — QualiPilot

---

## Problème

> Aujourd'hui, le suivi qualité des bugs repose sur des données éclatées et des contrôles partiellement manuels, ce qui empêche un pilotage centralisé, fiable et actionnable — d'où le besoin d'un cockpit unique permettant de contrôler, suivre et agir directement sur la qualité dans Azure DevOps.

---

## Utilisateur cible

- **Rôle :** Quality Manager interne (usage solo)
- **Besoin :** Vue centralisée des anomalies de conformité, des KPIs qualité, et possibilité d'agir directement sur les work items Azure DevOps
- **Frustration actuelle :** Basculer entre ADO, Power BI et Excel ; contrôles de conformité partiellement manuels ; impossible d'agir sans quitter l'outil de pilotage
- **Contexte :** Suit 8 équipes sur 2 produits (Live + Historique), travaille avec des PI/Sprints ADO, familière SQL

---

## Parcours utilisateur

1. Elle ouvre QualiPilot, voit l'état de santé qualité en un coup d'œil (bugs non conformes, KPIs sprint en cours)
2. Elle consulte les anomalies de conformité, filtre par équipe ou règle, identifie les bugs problématiques
3. Elle clique sur un bug, voit le détail + violations, et corrige directement les champs ADO depuis l'appli
4. Elle suit l'évolution dans le temps via les dashboards KPI (defect debt, backlog par PI/sprint)
5. Les données sont fraîches automatiquement — plus besoin d'aller dans ADO au quotidien

---

## Top 5 Features MVP

| # | Feature | Valeur |
|---|---------|--------|
| 1 | **Sync ADO** | Fetch les bugs depuis ADO, stocke en cache SQLite |
| 2 | **Moteur de conformité** | Évalue les 6 règles, stocke les violations détectées |
| 3 | **Dashboard + liste anomalies** | Vue d'ensemble + liste filtrée par équipe/règle |
| 4 | **Détail bug + write ADO** | Correction directe des champs + audit log systématique |
| 5 | **KPI & historique** | Defect debt, backlog evolution, snapshots automatiques |

---

## Scope MVP

### Dans le scope ✅

- Synchronisation manuelle et automatique des bugs depuis Azure DevOps
- Moteur de règles de conformité (6 règles initiales, configurables)
- Page d'accueil : résumé état qualité du jour
- Page Conformité : liste des anomalies filtrables + détail bug
- Correction de champs ADO depuis l'appli (whitelist stricte + confirmation + audit)
- Dashboards KPI : defect debt, évolution backlog par PI/sprint/équipe
- Snapshots hebdomadaires automatiques

### Hors scope MVP ❌ (IDEAS.md)

- Interface de paramétrage métier (équipes, objectifs, règles) → V1
- Export CSV des violations et KPIs → V1
- Notifications email/Teams → V2
- Multi-utilisateurs / authentification Azure AD → V2
- Tests end-to-end Playwright → V2
- Migration PostgreSQL → V2

---

## Direction visuelle

Minimaliste et sérieux, avec une vraie personnalité visuelle : moderne, joli, accueillant.
Bleu foncé `#1E40AF` + accent `#3B82F6`. Statuts marqués (vert/rouge/orange).
Données denses mais lisibles. Accessibilité WCAG AA. Quelques touches décoratives bienvenues.

---

## Critères de succès

| Métrique | Cible |
|----------|-------|
| Voir toutes les anomalies de conformité | < 5 secondes après sync |
| Corriger un champ ADO depuis l'appli | 2 clics + confirmation explicite |
| Snapshot hebdo automatique | 0 action manuelle requise |
| Zéro régression lors d'une nouvelle règle | Tests verts en continu |
| Données fraîches sans aller dans ADO | Sync auto + sync manuelle disponible |
