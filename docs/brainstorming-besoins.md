# Brainstorming — Besoins Cookizy

Notes de cadrage produit. À relire avant chaque nouvelle étape de dev.

---

## Planning

- Midi + soir uniquement (pas de petit-déjeuner)
- **Nombre de personnes par repas** : configurable à chaque repas (pas global)
- Historique dès le début : le planning n'est pas "juste la semaine courante", c'est une timeline de repas avec dates

---

## Ingrédients

- **Catalogue d'ingrédients** : quand on crée une recette, on choisit les ingrédients dans le catalogue
- **Création à la volée** : si l'ingrédient n'existe pas, on peut le créer directement depuis la saisie de recette (pas besoin d'aller dans un écran séparé)
- **Catégories** : liste préfaite mais créable à la volée aussi (même logique)
- Exemples de catégories de base : Légumes, Fruits, Viandes, Poissons, Produits laitiers, Épicerie sèche, Surgelés, Épices & condiments, Boissons

---

## Recettes

- **Tags** : une recette peut avoir plusieurs tags (ex: Viande + Repas rapide)
- Tags prédéfinis : Apéro, Viandes, Poissons, Accompagnements, Desserts, Repas rapide, Végétarien — créables à la volée aussi
- **Portions** : une recette est définie pour X portions
- Lors de la planification, on spécifie le nombre de personnes → les quantités s'adaptent
- Une recette peut être utilisée plusieurs fois dans la semaine (rare) ou dans le mois

---

## Portions et ingrédients "indivisibles" — Problème UX

**Problème** : certains ingrédients ne se divisent pas facilement (0.5 œuf ≠ naturel), d'autres si (0.5 courgette = ok, 150g farine = ok).

**Approche retenue** : flag `divisible` sur chaque ingrédient

- Unités de poids/volume (g, kg, ml, cl, l) → `divisible: true` par défaut
- Unité `pièce` → `divisible: false` par défaut, mais modifiable (ex: courgette en pièces peut être mise à `true`)
- À l'affichage de la liste de courses :
  - Ingrédient divisible → afficher la quantité calculée (ex: 180g farine)
  - Ingrédient non-divisible → arrondir à l'entier supérieur + afficher un indicateur "arrondi" (ex: 1 œuf ← arrondi de 0.75)

---

## Liste de courses

- Période **libre** (date de début → date de fin)
- Adapte les quantités en fonction du nombre de personnes de chaque repas
- Gère les ingrédients non-divisibles (arrondi au-dessus + indicateur)
- Agrège les ingrédients identiques de plusieurs recettes (ex: tomates de 3 recettes → total)

---

## Import de recettes

**Besoin** : importer depuis texte libre, photo (ex: livre de cuisine), PDF.

**Complexité** : photo et PDF nécessitent de l'OCR ou de l'IA (vision).
→ Voir section "Import" dans docs/IDEAS.md pour la réflexion v2.
→ **À décider** : est-ce que l'import photo/PDF est MVP ou v2 ?

---

## Historique

- Les repas planifiés sont stockés avec leur date → l'historique existe naturellement
- Pas de feature spécifique à développer pour l'historique : c'est une vue filtrée sur des dates passées
