# IDEAS.md — Backlog QualiPilot (V1+)

Ce fichier recense les fonctionnalités imaginées mais hors du scope MVP.
À consulter quand le MVP est stable et qu'on veut évoluer.

---

## V1 — Après MVP stabilisé

### Interface de paramétrage métier
- Ajouter / modifier des équipes depuis le front
- Gérer les objectifs max bugs par équipe et par sprint depuis le front
- Modifier la liste des builds valides pour la règle `INTEGRATION_BUILD_REQUIRED`
- Activer / désactiver des règles de conformité

### Comparaison objectif vs réalisé
- Tableau par équipe et par sprint : objectif max bugs vs réel
- Historique de l'évolution sprint après sprint

### Dashboards KPI avancés
- Defect debt par PI (Global, Live, Historique, Hors Version)
- Évolution du backlog dans le temps (courbe)
- Répartition bugs fermés par PI et par produit
- Répartition bugs corrigés par PI et par équipe
- Vue "Suivi Point Backlog" par version souhaitée

### Export
- Export CSV des violations de conformité
- Export CSV des KPIs

---

## V2 — Évolutions futures

### Notifications
- Alerte email / Teams si un seuil d'anomalies est dépassé
- Rappel hebdomadaire avec le résumé des violations

### Multi-utilisateurs
- Authentification Azure AD (SSO)
- Rôles : QM (admin), équipe (lecture)

### Intégration CI/CD
- GitHub Actions pour les tests
- Déploiement sur serveur interne partagé

### Améliorations techniques
- Tests end-to-end avec Playwright
- Migration PostgreSQL si usage multi-utilisateurs
- Observabilité : dashboard des performances (durée sync, nb items traités)
