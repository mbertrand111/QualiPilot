# Design système — QualiPilot

## Couleurs

| Rôle | Valeur |
|------|--------|
| Primaire | `#1E40AF` (bleu foncé) |
| Accent | `#3B82F6` (bleu) |
| Succès / bon | `#16A34A` (vert) |
| Anomalie / erreur | `#DC2626` (rouge) |
| Avertissement | `#D97706` (orange) |

## Règles CSS

- **Tailwind CSS uniquement** — pas de CSS inline, pas de fichiers `.css` custom
- Mobile-first, accessible WCAG AA
- Hover sur liens/boutons : bleu (`#3B82F6`), pas orange

## Composants réutilisables

Dans `frontend/src/components/` : `Button`, `Card`, `Badge`, `FilterBar`, …

Réutiliser les composants existants avant d'en créer de nouveaux.
