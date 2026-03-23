# Project Canvas — QualiPilot

---

## Problème

> Le pilotage qualité repose sur plusieurs outils disparates (Azure DevOps, Power BI, suivi Excel manuel)
> sans vue unifiée, sans actions directes possibles, et sans historisation automatique des indicateurs.

---

## Utilisateur cible

- **Rôle :** Quality Manager
- **Besoin :** Vue centralisée des anomalies de conformité, des KPIs qualité, et possibilité d'agir directement sur les work items Azure DevOps
- **Frustration actuelle :** Basculer entre ADO, Power BI et Excel ; suivi manuel des objectifs sprint ; impossible d'agir sans quitter l'outil de pilotage

---

## Domaines fonctionnels

1. **Conformité** — Détection des bugs mal renseignés (priorité, version, build, cohérence)
2. **KPIs qualité** — Defect debt, évolution backlog, bugs créés/fermés par PI/sprint/équipe
3. **Historisation** — Snapshots automatiques hebdomadaires des indicateurs clés
4. **Actions** — Correction de certains champs ADO directement depuis l'appli, avec audit

---

## Scope MVP ✅

- Synchronisation des bugs depuis Azure DevOps (cache local SQLite)
- Moteur de règles de conformité (6 règles initiales)
- Page Conformité : liste des anomalies filtrables, détail par bug
- Dashboard d'accueil : résumé des KPIs clés
- Historisation automatique hebdomadaire des snapshots

## Hors scope MVP ❌

- Interface d'administration des règles (V1)
- Gestion des objectifs par sprint depuis le front (V1)
- Graphiques avancés type Power BI (V1 progressive)
- Notifications / alertes email (V2)
- Multi-utilisateurs / gestion des accès (V2)

---

## Critères de succès

| Métrique | Cible |
|----------|-------|
| Voir toutes les anomalies de conformité | < 5 secondes après sync |
| Corriger un champ ADO depuis l'appli | 2 clics + confirmation |
| Snapshot hebdo automatique | 0 action manuelle requise |
| Zéro régression lors d'une nouvelle règle | Tests verts en continu |
