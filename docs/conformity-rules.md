# Règles de conformité — QualiPilot

Implémentées dans `backend/src/services/conformity.ts`.
10 règles actives, évaluées à chaque sync.

---

## PRIORITY_CHECK
Tous les bugs doivent être en priorité 2.
- Violation si : `Priority <> 2`

---

## VERSION_SOUHAITEE_CHECK
La "Version souhaitée GC" doit correspondre à un format valide selon le type de bug.

**Formats valides :**
- **Live** : `FAH_xx.yy` — xx = année (25, 26, 27…), yy = multiple de 10 (10, 20, 30…)
- **OnPremise** : `13.86.xxx` ou `13.87.xxx` — xxx = tout entier (pas de contrainte de multiple)
  - Suffixe `Export` optionnel : `13.86.500 Export`
  - Suffixe patch numérique : `13.87.300 Patch 2` (pas `Patch V7`)
- **Placeholder `13.87.XXX`** : accepté si état = `New` ou `Active` ET `Found In` commence par `13.`
  - **Interdit** si état = `Closed` ou `Resolved` (version précise obligatoire à la clôture)

**Valeurs spéciales toujours acceptées :** `-` · `Non concerné` · `Outil Jbeg` · `Sonarqube` · `Isasite` · `Isacuve Web` · `git`

---

## INTEGRATION_BUILD_NOT_EMPTIED
Les bugs `New` ou `Active` ne doivent **pas** avoir un Integration Build renseigné.
- Violation si : `State IN ('New', 'Active') AND Integration Build <> ''`

---

## INTEGRATION_BUILD_REQUIRED
Les bugs `Closed`/`Resolved` doivent avoir un Integration Build valide.
- Valeurs spéciales acceptées : `-` · `Non concerné` · `Isasite` · `Outil Jbeg` · `Isacuve Web`
- La liste des builds valides est configurable en JSON (paramètres → règles)

---

## VERSION_BUILD_COHERENCE
Le Integration Build doit être cohérent avec la Version souhaitée et le Found In.

- **OnPremise + version souhaitée Live** (sans `/ live` dans Found In) → violation (incohérence produit)
- **OnPremise** : version souhaitée `13.87.300` → builds valides entre la version majeure précédente +1 et `13.87.299`
- **Live** : version souhaitée `FAH_26.20` → builds valides `26.11.xxx`
- **Patch** : `FAH_26.10 Patch 3` → build `26.10.001-3` (idem OnPremise)
- La table version↔builds est entièrement configurable en JSON

---

## CLOSED_BUG_COHERENCE
Un bug fermé **sans correction** doit avoir `-` dans les deux champs.
- Condition : raison de clôture ≠ `Corrigé` ET ≠ `Réalisé`
- Violation si Version souhaitée ou Integration Build ≠ `-`
- Les **deux** champs doivent être `-`

---

## NON_CONCERNE_COHERENCE
Si un champ vaut `Non concerné`, l'autre doit aussi valoir `Non concerné`.
- Violation si un champ = `Non concerné` ET l'autre ≠ `Non concerné`

---

## FAH_VERSION_REQUIRED
Les bugs trouvés sur une version FAH moderne (Found In année ≥ 24) doivent avoir une Version souhaitée contenant `FAH`.
- Violation si Found In `24.x`/`25.x`/`26.x`… ET Version souhaitée ne contient pas `FAH`
- Exceptions : `-` · `Non concerné` · `Isasite` · `Outil Jbeg` · `git` · `Isacuve Web` · `Migration`
- **Non concernée** : Found In `14.xx`–`17.xx` (anciennes FAH pré-2024)

---

## TRIAGE_AREA_CHECK (CLOSED_BUG_IN_TRIAGE_AREA + AREA_PATH_PRODUCT_COHERENCE)
Regroupe plusieurs sous-règles liées aux zones de triage :

1. **Bug Closed dans zone triage** → Version souhaitée ET Build doivent être exactement `-`
   - Zones concernées : `Bugs à prioriser`, `Bugs à corriger`
2. **Bug non-Closed à la racine "Bugs à corriger"** → doit être dans un sous-dossier
3. **Cohérence produit/sous-dossier** dans "Bugs à corriger" :
   - Found In `13.x` (OnPremise) → `Bugs à corriger\Versions historiques`
   - Found In `25.x`/`26.x`… (Live) → `Bugs à corriger\Versions LIVE`
   - `Non concerné` / `Isacuve Web` → `Bugs à corriger\Hors versions`
4. **OnPremise avec version souhaitée Live** sans requalification `/ live` → incohérent
