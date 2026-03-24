# Feature 2 : Moteur de conformité

**Moment dans le parcours :** Étape 2 (fond) — alimente la liste des anomalies consultées par la QM

---

## Spec fonctionnelle

| | |
|---|---|
| **Déclencheur** | Automatiquement après chaque sync ADO, ou manuellement via `POST /api/conformity/evaluate` |
| **Ce que le service fait** | Évalue les 10 règles de conformité sur chaque bug du cache, stocke les violations dans `conformity_violations` |
| **Output** | Nombre de violations détectées, réparties par règle et par sévérité (error/warning) |

---

## Les 10 règles de conformité

### R1 — PRIORITY_CHECK
**Sévérité :** Erreur

Tous les bugs doivent être en Priorité 2.

- Violation si : `Priority <> 2`

---

### R2 — VERSION_SOUHAITEE_CHECK
**Sévérité :** Erreur

La "Version souhaitée GC" doit être dans un format valide (bugs actifs uniquement).

Formats valides :
- Live : `FAH_xx.yy` — xx = année (25, 26, 27…), yy = multiple de 10 (10, 20, 30…)
- Historique : `13.87.xxx`
- Valeurs spéciales : `Outil Jbeg` · `Sonarqube` · `Isasite` · `Isacuve Web` · `git` · `12.` · `13.8` · `14.` · `-` · `Non concerné`

---

### R3 — INTEGRATION_BUILD_REQUIRED
**Sévérité :** Erreur

Les bugs fermés (Closed/Resolved) doivent avoir un Integration Build valide.

Valeurs spéciales acceptées : `Isasite` · `Outil Jbeg` · `Isacuve Web` · `-` · `Non concerné`

La liste des builds valides est **configurable en JSON** dans `conformity_rules.rule_config`.

---

### R4 — VERSION_BUILD_COHERENCE
**Sévérité :** Erreur

Le Integration Build doit être cohérent avec la Version souhaitée GC.

**Historique :**
- Versions majeures : 13.87.150, 13.87.200, 13.87.250, 13.87.300… (configurables)
- Pour version souhaitée `13.87.200` → builds valides de `13.87.151` à `13.87.199`
- Règle générale : builds entre (version_majeure_précédente + 1) et (version_souhaitée - 1)

**Live :**
- Pour `FAH_26.10` → builds valides `25.31.xxx` (version précédente = FAH_25.30 = dernière de 2025)
- Pour `FAH_26.20` → builds valides `26.11.xxx` (version précédente = FAH_26.10)
- Règle générale : `previous_minor.xxx` où previous_minor = version précédente de la release

**Exception Patch :**
- Format accepté : `Version FAH_26.10 Patch X - Build 26.10.001-X` (idem OnPremise)
- Quand ce format est présent, la règle build↔version est assouplie

**Important :** toute la table de correspondance version↔builds est configurable en JSON (peut changer à chaque release).

---

### R5 — INTEGRATION_BUILD_NOT_EMPTIED
**Sévérité :** Avertissement

Les bugs à l'état Active ou New ne doivent pas avoir un Integration Build renseigné.

- Violation si : `State IN ('Active', 'New') AND Integration Build <> ''`

---

### R6 — CLOSED_BUG_COHERENCE
**Sévérité :** Erreur

Un bug fermé **sans correction** doit avoir `-` dans les **deux** champs Version souhaitée ET Integration Build.

- Condition : `Resolved Reason Custom <> 'Corrigé' AND <> 'Réalisé'`
- Violation si l'un des deux champs ne contient pas `-`
- Les deux doivent obligatoirement valoir `-` — pas l'un sans l'autre

---

### R7 — NON_CONCERNE_COHERENCE
**Sévérité :** Avertissement

Si un bug a `Non concerné` dans l'un des champs, l'autre doit également contenir `Non concerné`.

- Violation si : champ_A = `Non concerné` ET champ_B ≠ `Non concerné`
- Cas d'usage : bug sur périmètre non applicatif (hors livraison produit)
- Les deux champs doivent être renseignés ensemble avec `Non concerné`

---

### R8 — FAH_VERSION_REQUIRED
**Sévérité :** Erreur

Les bugs trouvés sur des versions FAH récentes doivent avoir une Version souhaitée GC contenant `FAH`.

- **Versions FAH modernes** : `Found In` commence par une année ≥ 24 (ex : `24.`, `25.`, `26.`…)
  Format `xx.yy` — xx = année à 2 chiffres, yy = multiple de 10. Avant 2024 : format 14.xx–17.xx (hors scope).
- Violation si Found In ≥ `24.` ET Version souhaitée ne contient pas `FAH`
- Exceptions : `-` · `Non concerné` · `Isasite` · `Outil Jbeg` · `git` · `Isacuve Web` · `Migration`

---

### R9 — CLOSED_BUG_IN_TRIAGE_AREA
**Sévérité :** Erreur

Un bug fermé (Closed) dans les zones de triage ne doit pas avoir une Version souhaitée différente de `-`.

Area Paths concernés :
- `Isagri_Dev_GC_GestionCommerciale\Bugs à prioriser`
- `Isagri_Dev_GC_GestionCommerciale\Bugs à corriger`

- Violation si : `State = 'Closed' AND Area Path IN (zones triage) AND Version souhaitée <> '-'`

---

### R10 — AREA_PATH_PRODUCT_COHERENCE
**Sévérité :** Erreur

Les bugs dans "Bugs à corriger" doivent être classés dans le bon sous-dossier selon leur version Found In.

| Found In | Area Path attendu |
|----------|-------------------|
| Commence par une année ≥ 24 (ex: `24.`, `25.`, `26.`…) — **LIVE** | `...\Bugs à corriger\Versions LIVE` |
| Commence par `13.` (jusqu'à `13.99`) — **OnPremise** | `...\Bugs à corriger\Versions historiques` |

- Violation si le sous-dossier ne correspond pas au type produit détecté
- S'applique **quel que soit l'état du bug** dès qu'il est sous "Bugs à corriger"

---

## Comportement attendu du service

- Charger les règles **actives** depuis `conformity_rules` (filtrées sur `active = 1`)
- Pour chaque bug dans `bugs_cache`, évaluer chaque règle applicable
- **Upsert** dans `conformity_violations` (contrainte UNIQUE sur `bug_id + rule_id`)
- **Résoudre automatiquement** les violations qui ne sont plus valides (`set resolved_at = now()`)
- La table de correspondance version↔builds est lue depuis `rule_config` JSON de R4 — jamais hardcodée

---

## États UI

- **En cours** : "Évaluation des règles en cours…"
- **Succès** : résumé sur le dashboard — "X anomalies détectées (Y erreurs, Z avertissements)"
- **Erreur** : log structuré + message d'erreur sans planter l'app

---

## Contrat technique

- **Route lecture** : `GET /api/conformity/violations?team=X&rule=Y&severity=Z`
- **Response** : `{ violations: Violation[], total: number, byRule: Record<string, number> }`
- **Évaluation** : déclenchée automatiquement en fin de `POST /api/sync`
- **Service** : `backend/src/services/conformity.ts`
- **Page frontend** : `frontend/src/pages/Conformity.tsx`

---

## Starter prompt Claude Code

```
/project:feature-dev

Je veux implémenter la feature "Moteur de conformité" (Feature 2 du MVP QualiPilot).

Service conformity.ts : évalue les 10 règles de conformité sur tous les bugs du cache SQLite.
Les règles sont chargées depuis la table conformity_rules (rule_config JSON, active = 1).
Résultat stocké dans conformity_violations (upsert UNIQUE bug_id+rule_id, résolution auto).

Les 10 règles (voir docs/features/02-moteur-conformite.md pour le détail complet) :
R1 PRIORITY_CHECK, R2 VERSION_SOUHAITEE_CHECK, R3 INTEGRATION_BUILD_REQUIRED,
R4 VERSION_BUILD_COHERENCE (configurable), R5 INTEGRATION_BUILD_NOT_EMPTIED,
R6 CLOSED_BUG_COHERENCE (les 2 champs à "-"), R7 NON_CONCERNE_COHERENCE,
R8 FAH_VERSION_REQUIRED, R9 CLOSED_BUG_IN_TRIAGE_AREA, R10 AREA_PATH_PRODUCT_COHERENCE.

Route GET /api/conformity/violations : liste paginée avec filtres team, rule, severity.
L'évaluation est déclenchée automatiquement à la fin de POST /api/sync.

Tests : chaque règle testée (cas violation + cas conforme + cas exception), filtres route.
```
