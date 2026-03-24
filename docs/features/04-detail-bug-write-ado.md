# Feature 4 : Détail bug + Write ADO

**Moment dans le parcours :** Étape 3 — elle clique sur un bug, voit le détail + violations, corrige directement depuis l'appli

---

## Spec fonctionnelle

| | |
|---|---|
| **Input utilisateur** | Clic sur un bug dans la liste anomalies → arrivée sur la page détail |
| **Ce que l'app affiche** | Tous les champs du bug + violations actives + formulaire de correction |
| **Output** | Champ ADO corrigé, confirmation affichée, entrée dans l'audit log |

---

## Page Détail bug

### Section "Informations bug"
- ID, titre, état, priorité, équipe, filière
- Area Path, Iteration Path (sprint/PI en cours)
- Found In, Integration Build, Version souhaitée GC
- Resolved Reason, Assigned To
- Dates : création, résolution, dernière modification

### Section "Anomalies détectées"
- Liste des violations actives sur ce bug
- Badge sévérité (error/warning) + description de la règle + ce qui ne va pas

### Section "Corriger"
- Formulaire limité aux **champs de la whitelist** uniquement
- Champs corrigeables (MVP) : Priority, Integration Build, Version souhaitée GC
- Chaque champ modifiable affiche la valeur actuelle + un input de correction
- **Bouton "Appliquer"** → modal de confirmation avant tout envoi ADO

### Modal de confirmation
- "Vous allez modifier le champ X du bug #NNNN"
- Valeur actuelle → Nouvelle valeur
- Boutons : "Confirmer" | "Annuler"

---

## Sécurité (non négociable)

- Whitelist des champs modifiables validée **côté backend** (jamais côté frontend seul)
- Chaque write ADO loggué dans `ado_write_audit` (work_item_id, field, old_value, new_value)
- Validation Zod sur le body de la requête write
- En cas d'erreur ADO lors du write : rollback + message d'erreur clair

---

## États UI

- **Chargement** : skeleton du détail bug
- **Détail affiché** : toutes les sections remplies
- **Confirmation en cours** : modal ouverte
- **Write en cours** : spinner sur le bouton "Confirmer"
- **Succès** : toast "Champ modifié avec succès" + violations réévaluées
- **Erreur write** : toast rouge "Erreur lors de la modification — ADO n'a pas accepté la valeur"

---

## Contrat technique

- **Routes backend** :
  - `GET /api/bugs/:id` → détail complet d'un bug depuis le cache
  - `PUT /api/bugs/:id/fields` → write ADO + audit + re-sync du bug
  - Body : `{ field: string, value: string }` (Zod validé)
  - Response : `{ success: boolean, auditId: number }`
- **Page frontend** : `frontend/src/pages/ConformityDetail.tsx`
- **Service** : `backend/src/services/azureDevOps.ts` (méthode `updateWorkItemField`)

---

## Starter prompt Claude Code

```
/project:feature-dev

Je veux implémenter la feature "Détail bug + Write ADO" (Feature 4 du MVP QualiPilot).

Page ConformityDetail.tsx : affiche toutes les infos d'un bug (depuis GET /api/bugs/:id),
ses violations de conformité actives, et un formulaire de correction limité aux champs whitelistés.
Modal de confirmation avant tout envoi. Toast succès/erreur après l'action.

Route GET /api/bugs/:id : retourne le bug depuis bugs_cache + ses violations actives.
Route PUT /api/bugs/:id/fields : valide le body Zod { field: string, value: string },
vérifie que field est dans la whitelist backend, appelle ADO pour le write,
logue dans ado_write_audit, re-sync le bug dans le cache.

Whitelist MVP : Priority, Microsoft.VSTS.Build.IntegrationBuild, champ custom version souhaitée GC.
Sécurité : validation whitelist côté backend uniquement, jamais fiée au frontend.

Tests : GET détail, PUT champ valide, PUT champ hors whitelist → 403, erreur ADO → 502.
```
