# Design — Phase spec + maquette (IAckathon 2026)

**Date :** 2026-02-22
**Statut :** validé

---

## Problème

La phase de cadrage (T+0 à T+1h15) détermine toute la suite.
Trois risques simultanés :
1. Maquette IA trop générique (prompt trop vague)
2. Équipe pas alignée sur ce qu'on construit
3. Devs qui ouvrent Claude Code sans savoir précisément ce qu'ils codent

---

## Solution retenue : deux boucles IA avec stop de validation

```
T+0h00  Sujet annoncé
   │
   ▼
[BOUCLE 1 — /project:brainstorming, ~45 min]
   PM pilote Claude Code, équipe répond oralement
   Questions : problème → personas → parcours → features → style
   Sorties écrites automatiquement :
     • CLAUDE.md section Project Overview → remplie
     • docs/pm/project-canvas.md → rempli
     • docs/features/<feature>.md × N → une fiche par dev
     • prompt /project:frontend-design → généré et prêt
   │
   ▼
[STOP COLLECTIF — 10 min]
   Chacun lit sa fiche feature
   On se met d'accord : ça correspond au sujet ?
   Chaque dev signe sa fiche ("ok je prends ça")
   │
   ▼
[BOUCLE 2 — /project:frontend-design, ~20 min]
   PM colle le prompt généré par /project:brainstorming
   1-2 itérations max, tout le monde valide visuellement
   Maquette = contrat visuel pour toute la suite
   │
   ▼
T+1h15  Chacun ouvre Claude Code avec sa fiche + la maquette → exécution autonome
```

---

## Artefacts produits

### 1. `/project:brainstorming` spécialisé hackathon

Séquence de questions fixe dans cet ordre :
1. Le problème en une phrase (qui souffre de quoi ?)
2. Le parcours principal en 3-5 étapes (narration, pas liste de features)
3. Ce qui est hors scope (cadre le jury)
4. Découpage en N features indépendantes avec input/output de chacune
5. Direction visuelle : ton, ambiance, ce qui doit marquer le jury

Sorties : CLAUDE.md rempli + canvas rempli + fiches features + prompt frontend-design prêt.

### 2. `docs/features/<feature-name>.md` — fiche feature

```
Nom de la feature
Qui l'utilise, dans quel moment du parcours
Input utilisateur : ___
Ce que l'IA fait : [prompt système résumé]
Output affiché : ___
États UI : loading / résultat / erreur
Route backend : POST /api/___
Page frontend : pages/___.tsx
```

C'est le starter prompt que le dev colle dans Claude Code pour lancer `/project:feature-dev`.

### 3. Prompt `/project:frontend-design` généré

Pas un template statique — une sortie du skill `/project:brainstorming`.
Inclut : parcours complet, pages à générer, états clés, direction visuelle choisie ensemble.

---

## Périmètre d'implémentation

| Action | Fichier |
|--------|---------|
| Modifier | `.claude/commands/brainstorming.md` |
| Modifier | `docs/rte/sprint-plan.md` |
| Modifier | `docs/GUIDE.md` |
| Créer | `docs/features/README.md` |
| Créer | `docs/features/.gitkeep` |
