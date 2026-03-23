# Roadmap Cookizy

Développement solo, itératif. Une étape à la fois, toujours testée et fonctionnelle avant de passer à la suivante.

---

## Étape 0 — Setup & Infrastructure

- [ ] Installer SQLite (`better-sqlite3`) dans le backend
- [ ] Créer `backend/src/db/index.ts` (connexion + migrations au démarrage)
- [ ] Créer `backend/src/db/schema.sql`
- [ ] Installer Tailwind CSS dans le frontend
- [ ] Nettoyer `Home.tsx` (supprimer les références hackathon)
- [ ] Supprimer `backend/src/services/openai.ts` et sa dépendance (non utilisé)

## Étape 1 — Ingrédients (CRUD)

- [ ] `GET /api/ingredients` — liste tous les ingrédients
- [ ] `POST /api/ingredients` — crée un ingrédient
- [ ] `PUT /api/ingredients/:id` — modifie un ingrédient
- [ ] `DELETE /api/ingredients/:id` — supprime un ingrédient
- [ ] Page `Ingredients.tsx` — liste + formulaire d'ajout/édition
- [ ] Tests Vitest pour chaque route

## Étape 2 — Recettes (CRUD)

- [ ] `GET /api/recipes` — liste toutes les recettes
- [ ] `GET /api/recipes/:id` — détail d'une recette avec ses ingrédients
- [ ] `POST /api/recipes` — crée une recette avec ses ingrédients
- [ ] `PUT /api/recipes/:id` — modifie une recette
- [ ] `DELETE /api/recipes/:id` — supprime une recette
- [ ] Page `Recipes.tsx` — liste + formulaire complet
- [ ] Tests Vitest pour chaque route

## Étape 3 — Planning hebdomadaire

- [ ] `GET /api/planning?week=YYYY-WW` — planning d'une semaine
- [ ] `PUT /api/planning` — associer une recette à un repas (date + midi/soir)
- [ ] `DELETE /api/planning/:id` — vider un créneau
- [ ] Page `Planning.tsx` — grille 7j × 2 repas
- [ ] Tests Vitest pour chaque route

## Étape 4 — Liste de courses

- [ ] `GET /api/shopping-list?from=YYYY-MM-DD&to=YYYY-MM-DD` — agrège les ingrédients
- [ ] Regroupement par catégorie d'ingrédient
- [ ] Page `ShoppingList.tsx` — liste avec cases à cocher
- [ ] Tests Vitest

## Étape 5 — Polish

- [ ] Design cohérent bleu + rose sur toutes les pages
- [ ] Gestion des états loading / erreur sur toutes les pages
- [ ] Mobile-friendly (Tailwind responsive)
- [ ] Accessibilité : labels, contrastes, navigation clavier
