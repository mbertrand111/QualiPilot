# Prompt /project:frontend-design — QualiPilot

Colle exactement ce bloc dans Claude Code pour générer l'interface complète.

---

```
/project:frontend-design

Génère une interface complète pour QualiPilot — cockpit de pilotage qualité Azure DevOps.

Parcours utilisateur :
1. Elle ouvre QualiPilot, voit l'état de santé qualité en un coup d'œil (bugs non conformes, KPIs sprint en cours)
2. Elle consulte les anomalies de conformité, filtre par équipe ou règle, identifie les bugs problématiques
3. Elle clique sur un bug, voit le détail + violations, et corrige directement les champs ADO depuis l'appli
4. Elle suit l'évolution dans le temps via les dashboards KPI (defect debt, backlog par PI/sprint)
5. Les données sont fraîches automatiquement — un bouton "Synchroniser" est toujours accessible

Pages à créer :
- Home : dashboard résumé — cards KPI (nb bugs, nb anomalies errors/warnings, dernière sync),
  mini-tableau répartition par équipe, bouton "Synchroniser" proéminent
- Conformity : tableau des violations filtrables (équipe, règle, sévérité), badges couleur,
  clic → détail ; message positif si 0 anomalie
- ConformityDetail : détail complet d'un bug — infos ADO, liste des violations actives,
  formulaire de correction (champs whitelistés seulement), modal de confirmation, audit trail
- Kpis : graphiques defect debt + évolution backlog + répartition bugs fermés par équipe/PI,
  filtres PI/équipe/produit
- History : tableau des snapshots KPI historiques avec filtres
- Settings : connexion ADO (statut PAT), paramètres (lecture seule en MVP)

Style :
- Minimaliste et sérieux, mais moderne, accueillant et joli — pas froid ni austère
- Quelques touches décoratives bienvenues (illustrations légères, micro-animations, gradients subtils)
- Couleurs primaires : bleu foncé #1E40AF, accent #3B82F6
- Statuts : vert #16A34A (conforme), rouge #DC2626 (anomalie error), orange #D97706 (warning)
- Tailwind CSS uniquement. Accessibilité WCAG AA.
- Skeleton loaders pendant les chargements
- Toasts pour les actions (succès/erreur)

Le jury (QM) doit retenir : un outil qui donne immédiatement le contrôle, où tout est visible
et actionnable sans effort — et qui fait envie d'utiliser au quotidien.
```
