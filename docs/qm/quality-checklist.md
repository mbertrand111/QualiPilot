# Quality Checklist — Cookizy

---

## Definition of Done

Une feature est **Done** quand toutes les cases suivantes sont cochées :

- [ ] Le code compile sans erreur TypeScript (`npm run lint`)
- [ ] Au moins un test Vitest couvre le happy path ET un cas d'erreur (`npm run test`)
- [ ] Les requêtes SQL utilisent des paramètres (pas de concaténation)
- [ ] Les inputs sont validés côté backend (champs vides, valeurs invalides)
- [ ] La route backend répond avec le bon format JSON
- [ ] L'interface React affiche le résultat sans erreur console
- [ ] Le comportement en cas d'erreur (API KO, champ vide) est géré et affiché à l'utilisateur
- [ ] Pas de `console.log` oublié
- [ ] Le commit est descriptif et atomique

---

## Commandes de test

```bash
# Tous les tests
npm run test

# Backend uniquement
npm --prefix backend test

# Frontend uniquement
npm --prefix frontend test

# Avec couverture
npm --prefix backend test -- --coverage
npm --prefix frontend test -- --coverage

# Mode watch (développement)
npm --prefix backend run test -- --watch
```

---

## Checklist sécurité

| Risque | Prévention |
|--------|-----------|
| SQL Injection | Requêtes paramétrées `better-sqlite3` (jamais de concaténation) |
| XSS | React échappe automatiquement — éviter `dangerouslySetInnerHTML` |
| Données sensibles | Jamais de secrets dans le code ou les commits |
| Validation | Valider chaque input au niveau de la route Express |
