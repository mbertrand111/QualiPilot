# Feature 1 : Sync ADO

**Moment dans le parcours :** Étape 5 (fond) — les données sont fraîches automatiquement, plus besoin d'aller dans ADO

---

## Spec fonctionnelle

| | |
|---|---|
| **Déclencheur** | Bouton "Synchroniser" dans l'UI, ou cron automatique |
| **Ce que le service fait** | Appelle l'API ADO via WIQL, récupère tous les bugs du projet, stocke/met à jour le cache SQLite (`bugs_cache`) |
| **Output** | Nombre de bugs synchronisés, timestamp de la dernière sync, statut OK/erreur |

---

## Comportement attendu

- Requête WIQL sur `Isagri_Dev_GC_GestionCommerciale` — tous les bugs (pas de filtre de date pour le premier chargement)
- Upsert dans `bugs_cache` (insert or replace basé sur l'ID work item ADO)
- Stocker le `raw_json` complet pour flexibilité future
- Mapper les champs standard ET les champs custom (Version souhaitée GC, Equipe, Filière, Resolved Reason Custom)
- En cas d'erreur ADO (401, 403, timeout) : logguer + retourner une erreur propre sans planter

---

## États UI

- **En cours** : spinner + "Synchronisation en cours..." + nb bugs traités si possible
- **Succès** : "✓ X bugs synchronisés — dernière sync : HH:MM" (badge vert)
- **Erreur** : "Synchronisation échouée — vérifier le PAT ADO" (badge rouge + détail)

---

## Contrat technique

- **Route backend** : `POST /api/sync`
- **Response** : `{ synced: number, lastSyncAt: string }`
- **Service** : `backend/src/services/sync.ts` + `backend/src/services/azureDevOps.ts`
- **Page frontend** : bouton dans le header ou page `Settings.tsx`

---

## Starter prompt Claude Code

```
/project:feature-dev

Je veux implémenter la feature "Sync ADO" (Feature 1 du MVP QualiPilot).

Objectif : POST /api/sync déclenche une synchronisation complète des bugs depuis Azure DevOps
vers le cache SQLite local (table bugs_cache).

Service azureDevOps.ts : requête WIQL pour récupérer tous les bugs du projet ADO configuré.
Service sync.ts : orchestre le fetch ADO → upsert SQLite (insert or replace par ID work item).
Stocker raw_json complet. Mapper les champs : state, priority, area_path, iteration_path,
assigned_to, team, filiere, found_in, integration_build, version_souhaitee, resolved_reason.

Route sync.ts : POST /api/sync → appelle sync service → retourne { synced: number, lastSyncAt: string }.
Gestion d'erreurs : 401/403 ADO → 502 avec message clair. Timeout → 504.

Tests : happy path (mock ADO → X bugs insérés), erreur 401 ADO, sync vide (0 bugs).
```
