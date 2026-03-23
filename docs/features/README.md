# docs/features/ — Fiches features

Ce répertoire contient une fiche par feature, générée par `/project:brainstorming` lors du cadrage J1.

Chaque fiche est le **contrat de la feature** : ce que le dev colle dans Claude Code pour démarrer.

---

## Template fiche feature

Copier-coller ci-dessous pour créer `docs/features/<feature-name>.md` :

```markdown
# Feature : <Nom>

**Propriétaire :** <Prénom>
**Moment dans le parcours :** <étape X — ex: "étape 2 — l'utilisateur colle son texte">

---

## Spec fonctionnelle

| | |
|---|---|
| **Input utilisateur** | <ce que l'utilisateur saisit ou fournit> |
| **Ce que l'IA fait** | <comportement attendu en 1-2 phrases> |
| **Output affiché** | <ce que l'utilisateur voit en retour> |

---

## États UI

- **Loading** : <message ou indicateur pendant l'appel IA>
- **Résultat** : <description de l'affichage>
- **Erreur** : <message si l'IA ou le backend échoue>

---

## Contrat technique

- **Route backend** : `POST /api/<feature>`
- **Body** : `{ input: string }`
- **Response** : `{ result: string }`
- **Page frontend** : `frontend/src/pages/<Feature>.tsx`

---

## Prompt IA (système)

```
<Instruction système pour l'IA, en 1-3 phrases.
Ex : "Tu es un assistant RH. Analyse le CV fourni et retourne
les 3 points forts et les 2 points faibles en bullet points.
Sois concis et factuel.">
```

---

## Starter prompt Claude Code

Colle exactement ceci dans Claude Code pour démarrer :

```
/project:feature-dev

Je veux créer la feature "<Nom>".
L'utilisateur saisit <input> et obtient <output>.
L'IA doit <comportement IA attendu>.

Route backend : POST /api/<feature>
Page frontend : pages/<Feature>.tsx
États UI : loading pendant l'appel, affichage du résultat, message d'erreur si échec.
```
```

---

## Exemple rempli

`docs/features/analyse-cv.md` :

```markdown
# Feature : Analyse CV

**Propriétaire :** Marie
**Moment dans le parcours :** étape 2 — l'utilisateur colle le texte de son CV

## Spec fonctionnelle

| | |
|---|---|
| **Input utilisateur** | Texte brut du CV (collé dans un textarea) |
| **Ce que l'IA fait** | Identifie les 3 points forts et les 2 axes d'amélioration |
| **Output affiché** | Liste structurée : ✅ Points forts / ⚠️ Axes d'amélioration |

## États UI

- **Loading** : "Analyse en cours..."
- **Résultat** : Cards séparées pour points forts et axes d'amélioration
- **Erreur** : "L'analyse a échoué, réessaie dans quelques instants"

## Contrat technique

- **Route backend** : `POST /api/analyse-cv`
- **Body** : `{ input: string }`
- **Response** : `{ result: string }`
- **Page frontend** : `frontend/src/pages/AnalyseCv.tsx`

## Prompt IA (système)

```
Tu es un expert RH. Analyse le CV fourni et retourne exactement :
- 3 points forts (commencer par ✅)
- 2 axes d'amélioration (commencer par ⚠️)
Sois concis, factuel, bienveillant.
```

## Starter prompt Claude Code

```
/project:feature-dev

Je veux créer la feature "Analyse CV".
L'utilisateur colle le texte de son CV dans un textarea et obtient
une liste de ses points forts et axes d'amélioration.
L'IA doit identifier 3 points forts (✅) et 2 axes d'amélioration (⚠️).

Route backend : POST /api/analyse-cv
Page frontend : pages/AnalyseCv.tsx
États UI : loading "Analyse en cours...", affichage en cards, message d'erreur si échec.
```
```
