# Contexte métier — QualiPilot

## Produits / versions suivis

| Type | Nom interne | Nom affiché UI | Format version |
|------|------------|----------------|----------------|
| Produit hébergé | `fah` | **Live** | `FAH_xx.yy` (ex: FAH_26.20) |
| Produit on-premise | `onpremise` | **Historique** | `13.87.xxx` |

---

## Classification des bugs (Live / OnPremise / Hors Version)

La classification se fait en priorité sur **Version souhaitée GC**, et en repli sur **Found In** si ce champ est vide.

> **Note d'implémentation** : cette logique est centralisée dans les helpers `isLiveBug` / `isOnPremiseBug` / `isRequalifiedToLive` dans `backend/src/services/conformity.ts`. Ne jamais dupliquer.

### Bug LIVE
- Version souhaitée contient : `14.xx`–`17.xx` (anciennes FAH), `13.99.xx`, ou année ≥ 24 (`24.xx`, `25.xx`, `26.xx`…)
- Le champ commence souvent par `FAH_` mais **ne pas se baser uniquement sur ce préfixe**
- Si Version souhaitée vide → appliquer la même règle sur **Found In**
- **Cas particulier** : Found In contient `Migration` → bug considéré LIVE

### Bug ONPREMISE
- Version souhaitée contient : `11.xx`, `12.xx`, ou `13.xx` avec valeur **< 13.99**
- `13.99.xx` est Live, pas OnPremise
- Si Version souhaitée vide → appliquer la même règle sur **Found In**

### Bug HORS VERSION
- Version souhaitée est exactement `Non concerné`

### Bug NON CATÉGORISÉ
- Ne rentre dans aucune catégorie — doit être à zéro en fonctionnement normal

### Requalification OnPremise → Live
- Found In `13.86.300 / live` (contient `/ live`) → bug traité comme Live pour les règles de conformité

---

## Équipes (8 équipes actives)

COCO · GO FAHST · JURASSIC BACK · MAGIC SYSTEM · MELI MELO · NULL.REF · PIXELS · LACE

---

## Zones spéciales Azure DevOps (Area Path, pas des équipes)

- **Bugs à corriger** — bugs planifiés pour correction (avec sous-dossiers Versions LIVE / Versions historiques / Hors versions)
- **Bugs à prioriser** — bugs en attente de priorisation
- **Hors production** — bugs non applicatifs / indépendants d'une version
- Maintenance · Performance · Sécurité · QuestionsSL

---

## Structure Iterations (ADO)

Projet ADO : `Isagri_Dev_GC_GestionCommerciale`
Format : `{projet}\{année-année}\PI{n}\PI{n}-SP{m}`
Exemple : `Isagri_Dev_GC_GestionCommerciale\2025-2026\PI1\PI1-SP1`
Chaque PI = 4 sprints de 2 semaines + 1 sprint IP de 1 semaine.

---

## Champs ADO utilisés

| Nom affiché | Référence ADO | Type |
|-------------|---------------|------|
| Work Item Type | `System.WorkItemType` | Standard |
| State | `System.State` | Standard |
| Priority | `Microsoft.VSTS.Common.Priority` | Standard |
| Integration Build | `Microsoft.VSTS.Build.IntegrationBuild` | Standard |
| Found In | `Microsoft.VSTS.Build.FoundIn` | Standard |
| Area Path | `System.AreaPath` | Standard |
| Iteration Path | `System.IterationPath` | Standard |
| Assigned To | `System.AssignedTo` | Standard |
| Version souhaitée GC | à confirmer — champ custom | Custom |
| Resolved Reason Custom | à confirmer — champ custom | Custom |
| Equipe | à confirmer — champ custom | Custom |
| Filière | à confirmer — champ custom | Custom |
