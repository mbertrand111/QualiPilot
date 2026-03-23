# Architecture Decision Records — QualiPilot

---

## ADR-001 — Monorepo Express + React

**Date :** Mars 2026
**Statut :** Accepté

### Contexte

Application interne, usage solo, besoin de démarrer vite sans infrastructure lourde.

### Décision

Monorepo npm avec deux packages :
- **Backend** : Express.js + TypeScript, port 3001
- **Frontend** : React + Vite + TypeScript + Tailwind CSS, port 5173

### Justification

- Express est minimal et extensible — parfait pour exposer une API REST devant Azure DevOps
- Vite offre un démarrage instantané et le proxy `/api` évite les problèmes CORS
- TypeScript strict prévient les erreurs silencieuses (critique pour les writes ADO)
- Vitest permet des tests rapides sans config complexe

### Conséquences

- **Positif :** Setup en une commande, hot-reload natif, un seul repo
- **Positif :** Le PAT Azure DevOps reste côté serveur, jamais exposé au navigateur
- **Négatif :** Pas de containerisation — Node.js doit être installé localement

---

## ADR-002 — SQLite comme base de données

**Date :** Mars 2026
**Statut :** Accepté

### Contexte

Application interne, usage mono-utilisateur, besoin d'historiser des données et de cacher les données ADO localement.

### Décision

SQLite via le package `better-sqlite3`.

### Justification

- Zéro configuration serveur (fichier local `qualipilot.db`)
- Parfait pour usage mono-utilisateur
- `better-sqlite3` est synchrone → code simple, pas de callback hell
- Standard SQL familier (compatible avec SSMS-like mental model)
- Transactions et clés étrangères supportées
- Facilement migrable vers PostgreSQL si besoin futur (multi-utilisateurs)
- Pour ce volume de données (quelques centaines à milliers de bugs), SQLite est largement suffisant

### Alternatives évaluées

- **DuckDB** : excellent pour l'analytique, mais complexité supplémentaire non justifiée au MVP
- **PostgreSQL** : overkill pour usage solo sans serveur dédié

### Conséquences

- **Positif :** Démarrage immédiat, pas de Docker, pas de service externe
- **Positif :** Le fichier `.db` peut être sauvegardé simplement (copie fichier)
- **Négatif :** Pas adapté au multi-utilisateurs concurrent (hors scope)

---

## ADR-003 — Tailwind CSS pour le styling

**Date :** Mars 2026
**Statut :** Accepté

### Contexte

Besoin d'un design moderne, professionnel et cohérent, orienté outil analytique interne.

### Décision

Tailwind CSS v3.

### Justification

- Pas de fichiers CSS à maintenir
- Classes utilitaires auto-documentées dans le JSX
- Mobile-first par défaut
- Excellent support IntelliSense dans VS Code

### Conséquences

- **Positif :** Productivité élevée pour le styling
- **Positif :** Design cohérent sans architecture CSS complexe
- **Négatif :** JSX peut devenir verbeux — mitiger avec des composants UI réutilisables

---

## ADR-004 — PAT Azure DevOps côté backend uniquement

**Date :** Mars 2026
**Statut :** Accepté

### Contexte

L'application doit lire et écrire des work items Azure DevOps. Le token d'authentification ne doit jamais être exposé.

### Décision

Le PAT est stocké uniquement dans `.env` côté backend. Toutes les requêtes ADO transitent par le backend. Le frontend n'a jamais accès au token.

### Justification

- Sécurité : un PAT ADO avec droits en écriture est sensible
- Contrôle : le backend peut valider, auditer et limiter les opérations d'écriture
- Traçabilité : chaque write ADO est loggué dans `ado_write_audit`

### Conséquences

- **Positif :** Surface d'attaque minimale
- **Positif :** Whitelist des champs modifiables appliquée côté serveur
- **Négatif :** Toute opération ADO nécessite un aller-retour backend (acceptable)

---

## ADR-005 — Cache local ADO + sync manuelle/schedulée

**Date :** Mars 2026
**Statut :** Accepté

### Contexte

Appeler Azure DevOps à chaque affichage de page serait lent, coûteux en API calls, et risquerait le rate limiting.

### Décision

Les bugs ADO sont synchronisés dans `bugs_cache` (SQLite local). La sync est déclenchable manuellement (`POST /api/sync`) ou automatiquement via cron. L'application affiche toujours les données du cache.

### Justification

- Performances : affichage instantané depuis SQLite
- Règles de conformité calculées localement sur les données cachées
- Historisation possible : les snapshots capturent l'état du cache à un instant T
- Résilience : l'appli fonctionne même si ADO est temporairement inaccessible

### Conséquences

- **Positif :** Contrôle total sur les données, pas de dépendance en temps réel à ADO
- **Positif :** Les calculs de KPI sont faits localement (pas de requêtes ADO complexes)
- **Négatif :** Données potentiellement légèrement en retard — afficher la date de dernière sync
