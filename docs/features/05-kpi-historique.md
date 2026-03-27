# Feature 5 : KPI & Historique

**Moment dans le parcours :** Étape 4 — le QM suit l'évolution qualité dans le temps et par PI

---

## Spec fonctionnelle

| | |
|---|---|
| **Input utilisateur** | Navigation vers la page KPIs + filtres (PI, équipe, produit, filière) |
| **Ce que l'app affiche** | 5 onglets de graphiques inspirés du Power BI existant |
| **Output** | Tendances qualité actionnables : Defect Debt, backlog, bugs fermés par PI, backlogs équipes |

---

## Concepts métier

### Defect Debt
`DefectDebt = bugs créés dans la période − bugs fermés`
- Positif (rouge) = la dette augmente
- Négatif (vert) = la dette diminue
- Décliné en 4 vues : Global · Live · OnPremise · Hors version

### Filière (depuis le titre du bug)
- `[CO]` dans le titre → **COMPTA**
- `[IW]` dans le titre → **OUTILS**
- Sinon → **GC**

### Produit (depuis version_souhaitee)
| Valeur | Libellé |
|--------|---------|
| Contient "FAH" + "Patch" | **Live Patch** |
| Contient "FAH" | **Live** |
| Contient "13.8" + "Patch" | **OnPremise Patch** |
| Contient "13.8" | **OnPremise** |
| Exactement "-" | **Non corrigés** |
| "Non concerné" | **Hors version** |
| Sinon | **Non catégorisé** |

### PI_Fermeture
PI dans lequel le bug a été fermé → `closed_date` comparée au calendrier des sprints.

### Objectif Backlogs équipes
Chaque équipe a un **nombre max de bugs GC** à ne pas dépasser en fin de sprint.
- Vérifié le **dernier jeudi avant la fin de sprint**
- Les bugs [CO] et [IW] **ne comptent pas** dans l'objectif
- L'équipe est définie par l'`area_path` (pas le champ `team`)
- Les bugs comptés = tous les bugs **non fermés** dans l'area path de l'équipe
- Les objectifs sont à configurer dans Paramètres (TODO)

---

## Calendrier des sprints 2025-2026 (hardcodé pour l'instant)

| PI | Début | Fin | Sprints |
|----|-------|-----|---------|
| PI1 | 04/08/2025 | 03/10/2025 | SP1: 04/08–15/08 · SP2: 18/08–29/08 · SP3: 01/09–12/09 · SP4: 15/09–26/09 · SP5: 13/10–17/10 |
| PI2 | 06/10/2025 | 05/12/2025 | SP1: 29/09–10/10 · SP2: 20/10–31/10 · SP3: 03/11–14/11 · SP4: 17/11–28/11 · SP5: 01/12–05/12 |
| PI3 | 08/12/2025 | 06/02/2026 | SP1: 08/12–19/12 · SP2: 22/12–02/01 · SP3: 05/01–16/01 · SP4: 19/01–30/01 · SP5: 02/02–06/02 |
| PI4 | 09/02/2026 | 10/04/2026 | SP1: 03/02–20/02 · SP2: 23/02–06/03 · SP3: 09/03–20/03 · SP4: 23/03–03/04 · SP5: 06/04–10/04 |
| PI5 | 13/04/2026 | 12/06/2026 | SP1: 13/04–24/04 · SP2: 27/04–08/05 · SP3: 11/05–22/05 · SP4: 25/05–05/06 · SP5: 08/06–12/06 |
| PI6 | 15/06/2026 | 14/08/2026 | SP1: 15/06–26/06 · SP2: 29/06–10/07 · SP3: 13/07–24/07 · SP4: 27/07–07/08 · SP5: 10/08–14/08 |

→ À paramétrer depuis Paramètres quand on développera cette page.

---

## Structure de la page — 5 onglets

### Onglet 1 — Defect Debt
- 4 graphes ComposedChart (barres + courbe) en grille 2×2
- Barres = déficit par PI (vert si négatif, rouge si positif)
- Courbe = nb bugs ouverts en fin de PI (axe Y droit)
- Filtre : toggle par PI (boutons-pill cliquables)
- Légende : vert = dette qui diminue, rouge = dette qui augmente

### Onglet 2 — Évolution backlog
- AreaChart avec 4 séries empilées (Total · Live · OnPremise · Hors version)
- Axe X = mois
- Calculable directement depuis bugs_cache : `COUNT WHERE created_date <= date AND (closed_date IS NULL OR closed_date > date)`

### Onglet 3 — Point backlog
- Filtre version souhaitée (select)
- 2 PieCharts côte à côte : par État · par Équipe
- Total au centre du donut
- Tableau bugs : ID · Titre · État · Équipe · Sprint

### Onglet 4 — Bugs fermés par PI
- ComposedChart barres groupées + courbe pointillée total
- Toggle : **Par produit** | **Par équipe**
- Par produit : Live / Live Patch / OnPremise / OnPremise Patch / Hors version / Non catégorisé
- Par équipe : 8 barres par PI

### Onglet 5 — Backlogs équipes
- Grille de 8 cards (une par équipe)
- Chaque card : barre de progression GC bugs / objectif (vert < 80% · amber 80-100% · rouge > 100%)
- Badges état (New / Active) + compteur CO/IW hors objectif
- Mini-barres top 3 versions
- Note : objectifs à configurer dans Paramètres

---

## Sync et données réelles

La sync ADO récupère :
- Tous les bugs **New/Active** (quel que soit l'âge)
- Tous les bugs **modifiés dans les 12 derniers mois** (inclut Closed/Resolved récents)

→ Suffisant pour les graphes par PI (12 derniers mois = environ 6 PIs).

---

## États UI

- **Chargement** : skeleton sur les graphiques
- **Données mockées** : bandeau amber d'avertissement visible
- **Aucune donnée** : message "Lancez une synchronisation"
- **Erreur** : message discret

---

## Contrat technique

- **Pages frontend** : `frontend/src/pages/Kpis.tsx` (tous les onglets)
- **Librairie graphiques** : **recharts** (installé)
- **Routes backend à créer** :
  - `GET /api/kpis/defect-debt?pi=X` — Defect Debt par PI
  - `GET /api/kpis/backlog-evolution` — snapshots mensuels depuis bugs_cache
  - `GET /api/kpis/point-backlog?version=X` — bugs par version avec répartition
  - `GET /api/kpis/closed-by-pi` — bugs fermés groupés par PI + produit/équipe
  - `GET /api/kpis/team-backlogs` — état des backlogs avec objectifs
- **Service** : `backend/src/services/kpi.ts`

---

## État d'avancement

| Élément | État |
|---------|------|
| Frontend Kpis.tsx — 5 onglets | ✅ Fait (données mockées) |
| recharts installé | ✅ Fait |
| Calendrier sprints hardcodé | ✅ Fait (dans Kpis.tsx) |
| Routes backend | ❌ À faire |
| Service kpi.ts | ❌ À faire |
| Branchement données réelles | ❌ À faire |
| Objectifs équipes configurables | ❌ À faire (Paramètres) |

---

## Starter prompt Claude Code (branchement données réelles)

```
/project:feature-dev

Je veux brancher la page Kpis.tsx sur des données réelles (feature KPI QualiPilot).
La page existe déjà avec des données mockées — il faut créer le backend et remplacer les mocks.

Service backend/src/services/kpi.ts :
- defectDebtByPi(piList?) : bugs créés - bugs fermés par PI, depuis bugs_cache + calendrier sprints hardcodé
- backlogEvolution(months=12) : nb bugs ouverts par mois (created_date <= date AND closed_date IS NULL OR > date)
- pointBacklog(version?) : bugs non fermés par version, répartition par état et par équipe
- closedByPi(piList?) : bugs Closed/Resolved groupés par PI_Fermeture + Produit + Équipe
- teamBacklogs() : bugs non fermés par team area_path, avec filière (CO/IW/GC depuis titre)

Sprint calendar (PI1 à PI6 2025-2026) hardcodé dans backend/src/config/sprints.ts.
Produit classifié selon version_souhaitee (Live/Live Patch/OnPremise/OnPremise Patch/Hors version/Non corrigés/Non catégorisé).
Filière classifiée selon titre ([CO]→COMPTA, [IW]→OUTILS, sinon GC).

Routes GET /api/kpis/defect-debt, /backlog-evolution, /point-backlog, /closed-by-pi, /team-backlogs.
Remplacer les constantes MOCK dans Kpis.tsx par des appels fetch vers ces routes.
```
