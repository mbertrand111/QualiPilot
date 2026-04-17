# Brainstorming — Cadrage produit

Tu guides le PM et l'équipe à travers 5 questions dans l'ordre exact ci-dessous.
Une question à la fois. Attends la réponse avant de passer à la suivante.
À la fin, tu écris tous les artefacts directement dans les fichiers — le PM ne rédige rien.

---

## Règles

- **Une seule question par message** — pas de liste, pas de sous-questions
- **Reformule la réponse** avant de passer à la suivante ("OK donc...")
- **Propose des exemples** si la réponse est vague
- **Ne passe pas à l'étape suivante** sans avoir une réponse exploitable
- **Ne génère aucun fichier** avant d'avoir répondu aux 5 questions

---

## Les 5 questions

### Question 1 — Le problème

> "En une phrase : qui a le problème, et c'est quoi ?"

Exemples de format attendu :
- "Un RH perd du temps à trier les CVs manuellement"
- "Un étudiant ne sait pas par où commencer pour réviser"
- "Un manager ne sait pas si son équipe est en train de décrocher"

---

### Question 2 — Le parcours utilisateur

> "Décris le parcours de l'utilisateur en 3 à 5 étapes. Pas une liste de features — ce qu'il fait, ce qu'il voit, ce qu'il ressent."

Exemple :
1. Il arrive sur l'app, voit un champ de saisie simple
2. Il colle / tape son contenu
3. L'IA analyse et lui retourne un résultat structuré
4. Il peut affiner ou relancer
5. Il repart avec quelque chose d'actionnable

Reformule le parcours reçu en étapes numérotées avant de continuer.

---

### Question 3 — Hors scope

> "Qu'est-ce qui est HORS scope pour cette version ?"

Suggère des exemples si l'équipe hésite :
- Login / gestion de comptes
- Persistance en base de données
- Support multi-langues
- Export PDF / intégrations externes
- Mobile / responsive poussé

L'objectif est de protéger le temps de l'équipe et de cadrer les attentes du jury.

---

### Question 4 — Découpage en features

> "On a [N] personnes. Chaque feature = une action utilisateur + un appel IA. Liste-moi [N] features indépendantes, une par personne."

Critères d'une bonne feature :
- Elle tient en une phrase ("L'utilisateur [fait X] et obtient [Y]")
- Elle implique un appel à l'IA (sinon c'est juste du CRUD)
- Elle est indépendante des autres (pas de dépendance entre devs)
- Elle est réalisable en 3-4h par une personne assistée par Claude Code

Si les features proposées ne sont pas indépendantes, aide à les découper.

---

### Question 5 — Direction visuelle

> "Pour la maquette : quelle ambiance ? Choisis une direction."

Exemples de directions :
- Médical / sobre / rassurant
- Futuriste / sombre / high-tech
- Playful / coloré / accessible
- Corporate / minimaliste / sérieux
- Editorial / magazine / texte dominant
- Urgence / alerte / dashboard opérationnel

---

## Sorties à générer

Une fois les 5 questions répondues, génère dans l'ordre :

### 1. Remplir CLAUDE.md — section Project Overview

Remplace le bloc `[TO FILL ON DAY 1]` dans `CLAUDE.md` :

```
Project Name  : <nom du projet>
Problem       : <problème en une phrase>
Target Users  : <persona principal>
Objective     : <ce que l'utilisateur obtient>
Key Features  : 1. <feature 1>
              : 2. <feature 2>
              : 3. <feature 3>
```

### 2. Remplir docs/pm/project-canvas.md

Remplis les sections :
- Problem Statement
- Target Users (les personas mentionnés)
- Top 3 Features (les features du découpage)
- MVP Scope : dans le scope = les features choisies / hors scope = la liste question 3
- Success Metrics : "La démo fonctionne de bout en bout pour le parcours principal"

### 3. Créer une fiche feature par personne

Pour chaque feature, crée `docs/features/<feature-name>.md` en suivant le template de `docs/features/README.md`.

Remplis notamment :
- Le moment dans le parcours utilisateur
- L'input/output exact
- Le comportement attendu de l'IA (prompt système en 1-2 phrases)
- Les 3 états UI : loading / résultat / erreur
- Le starter prompt Claude Code prêt à l'emploi

### 4. Générer le prompt /project:frontend-design

Produis un bloc prêt à copier-coller :

```
/project:frontend-design

Génère une interface complète pour <Nom du projet>.

Parcours utilisateur :
1. <étape 1>
2. <étape 2>
3. <étape 3>
[etc.]

Pages à créer :
- Home : <description>
- <Feature 1> : <description + états clés>
- <Feature 2> : <description + états clés>
[etc.]

Style : <direction visuelle choisie>
Le jury doit retenir : <ce qui doit marquer>
```

---

## Après la génération

Annonce à l'équipe :

> "Voilà ce qui a été généré :
> - CLAUDE.md mis à jour
> - docs/pm/project-canvas.md rempli
> - [N] fiches features dans docs/features/
> - Prompt /project:frontend-design prêt
>
> **Stop collectif (10 min)** : chacun lit sa fiche, on valide ensemble que ça colle au sujet.
> Ensuite le PM lance `/project:frontend-design` avec le prompt généré."
