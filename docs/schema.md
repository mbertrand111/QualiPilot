# Modèle de données SQLite — QualiPilot

Défini dans `backend/src/db/schema.sql`, appliqué au démarrage via migrations.

```sql
-- Équipes (référence configurable)
CREATE TABLE teams (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  ado_area  TEXT,
  active    INTEGER DEFAULT 1
);

-- Objectifs par équipe et sprint
CREATE TABLE team_sprint_objectives (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id     INTEGER REFERENCES teams(id),
  sprint_name TEXT NOT NULL,
  pi_name     TEXT,
  max_bugs    INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Règles de conformité (moteur de règles)
CREATE TABLE conformity_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK(severity IN ('error', 'warning')),
  active      INTEGER DEFAULT 1,
  rule_config TEXT NOT NULL  -- JSON : logique de la règle (valid_prefixes, etc.)
);

-- Cache des bugs synchronisés depuis ADO
CREATE TABLE bugs_cache (
  id                INTEGER PRIMARY KEY,  -- = ADO Work Item ID
  title             TEXT,
  state             TEXT,
  priority          INTEGER,
  area_path         TEXT,
  iteration_path    TEXT,
  assigned_to       TEXT,
  team              TEXT,
  filiere           TEXT,
  created_date      TEXT,
  resolved_date     TEXT,
  changed_date      TEXT,
  found_in          TEXT,
  integration_build TEXT,
  version_souhaitee TEXT,
  resolved_reason   TEXT,
  raw_json          TEXT,  -- JSON complet du work item ADO
  last_synced_at    TEXT DEFAULT (datetime('now'))
);

-- Violations de conformité détectées
CREATE TABLE conformity_violations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id      INTEGER REFERENCES bugs_cache(id),
  rule_id     INTEGER REFERENCES conformity_rules(id),
  detected_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  UNIQUE(bug_id, rule_id)
);

-- Snapshots KPI (historisation automatique hebdomadaire)
CREATE TABLE kpi_snapshots (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date         TEXT NOT NULL,
  team_id               INTEGER REFERENCES teams(id),
  sprint_name           TEXT,
  pi_name               TEXT,
  open_bugs             INTEGER,
  created_this_period   INTEGER,
  closed_this_period    INTEGER,
  violations_count      INTEGER,
  created_at            TEXT DEFAULT (datetime('now'))
);

-- Audit des écritures Azure DevOps (toutes les écritures)
CREATE TABLE ado_write_audit (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id  INTEGER NOT NULL,
  field         TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  performed_at  TEXT DEFAULT (datetime('now'))
);

-- Audit des corrections automatiques (subset de ado_write_audit)
-- Même (work_item_id, field, performed_at) → LEFT JOIN permet d'isoler les écritures manuelles
CREATE TABLE auto_fix_audit (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id  INTEGER NOT NULL,
  field         TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  performed_at  TEXT DEFAULT (datetime('now'))
);
```
