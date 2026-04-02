-- Équipes (référence configurable)
CREATE TABLE IF NOT EXISTS teams (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  ado_area  TEXT,
  active    INTEGER DEFAULT 1
);

-- Objectifs par équipe et sprint
CREATE TABLE IF NOT EXISTS team_sprint_objectives (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id     INTEGER REFERENCES teams(id),
  sprint_name TEXT NOT NULL,
  pi_name     TEXT,
  max_bugs    INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Règles de conformité (moteur de règles)
CREATE TABLE IF NOT EXISTS conformity_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK(severity IN ('error', 'warning')),
  active      INTEGER DEFAULT 1,
  rule_config TEXT NOT NULL DEFAULT '{}'
);

-- Cache des bugs synchronisés depuis ADO
CREATE TABLE IF NOT EXISTS bugs_cache (
  id                INTEGER PRIMARY KEY,
  title             TEXT,
  state             TEXT,
  priority          INTEGER,
  area_path         TEXT,
  iteration_path    TEXT,
  sprint            TEXT,   -- ex: "PI2-SP4", extrait de iteration_path
  assigned_to       TEXT,
  team              TEXT,   -- extrait du 2e segment de area_path
  filiere           TEXT,
  created_date      TEXT,
  resolved_date     TEXT,
  changed_date      TEXT,
  found_in          TEXT,
  integration_build TEXT,
  version_souhaitee TEXT,   -- Isagri.Feature.VersionSouhaiteeGC
  resolved_reason   TEXT,   -- Isagri.ResolvedReason (custom Isagri, pas Microsoft.VSTS.Common.ResolvedReason)
  raison_origine    TEXT,   -- Isagri.RaisonOrigine
  sprint_done       TEXT,   -- Isagri.Feature.SprintDone (ex: "PI6-SP3")
  raw_json          TEXT,
  last_synced_at    TEXT DEFAULT (datetime('now'))
);

-- Violations de conformité détectées
CREATE TABLE IF NOT EXISTS conformity_violations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id      INTEGER REFERENCES bugs_cache(id),
  rule_id     INTEGER REFERENCES conformity_rules(id),
  detected_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  UNIQUE(bug_id, rule_id)
);

-- Exceptions de conformite acceptees manuellement (waivers)
CREATE TABLE IF NOT EXISTS conformity_waivers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id      INTEGER NOT NULL REFERENCES bugs_cache(id) ON DELETE CASCADE,
  rule_id     INTEGER NOT NULL REFERENCES conformity_rules(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(bug_id, rule_id)
);

-- Snapshots KPI (historisation automatique hebdomadaire)
CREATE TABLE IF NOT EXISTS kpi_snapshots (
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

-- Historisation KPI "Backlogs équipes" + "Bugs à corriger LIVE"
-- Une ligne par sprint (SP1..SP4) capturée le vendredi.
CREATE TABLE IF NOT EXISTS kpi_team_backlog_snapshots (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date    TEXT NOT NULL, -- date locale Europe/Paris, format YYYY-MM-DD
  sprint_name      TEXT NOT NULL,
  pi_name          TEXT,
  live_area_bugs   INTEGER NOT NULL DEFAULT 0,
  source           TEXT NOT NULL,
  created_at       TEXT DEFAULT (datetime('now')),
  UNIQUE(sprint_name)
);

CREATE TABLE IF NOT EXISTS kpi_team_backlog_snapshot_rows (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id   INTEGER NOT NULL REFERENCES kpi_team_backlog_snapshots(id) ON DELETE CASCADE,
  team          TEXT NOT NULL,
  objective     INTEGER NOT NULL,
  gc_bugs       INTEGER NOT NULL,
  new_bugs      INTEGER NOT NULL,
  active_bugs   INTEGER NOT NULL,
  resolved_bugs INTEGER NOT NULL,
  co_bugs       INTEGER NOT NULL,
  iw_bugs       INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(snapshot_id, team)
);

-- Audit des écritures Azure DevOps
CREATE TABLE IF NOT EXISTS ado_write_audit (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id  INTEGER NOT NULL,
  field         TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  performed_at  TEXT DEFAULT (datetime('now'))
);

-- Journal des exécutions d'auto-remédiation (sync/scheduler)
CREATE TABLE IF NOT EXISTS auto_remediation_runs (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_source             TEXT NOT NULL,
  run_at                     TEXT NOT NULL,
  skipped                    INTEGER NOT NULL DEFAULT 0 CHECK(skipped IN (0, 1)),
  priority_attempted         INTEGER NOT NULL DEFAULT 0,
  priority_updated           INTEGER NOT NULL DEFAULT 0,
  priority_failed            INTEGER NOT NULL DEFAULT 0,
  integration_attempted      INTEGER NOT NULL DEFAULT 0,
  integration_updated        INTEGER NOT NULL DEFAULT 0,
  integration_failed         INTEGER NOT NULL DEFAULT 0,
  total_updated              INTEGER NOT NULL DEFAULT 0
);

-- Audit des corrections automatiques
CREATE TABLE IF NOT EXISTS auto_fix_audit (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id    INTEGER NOT NULL,
  rule_code       TEXT,
  field           TEXT NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  run_id          INTEGER REFERENCES auto_remediation_runs(id),
  trigger_source  TEXT NOT NULL,
  performed_at    TEXT DEFAULT (datetime('now')),
  acknowledged_at TEXT
);

-- Parametrage des versions majeures visibles dans les filtres KPI "Suivi par release"
CREATE TABLE IF NOT EXISTS kpi_release_version_filters (
  major_version TEXT PRIMARY KEY,
  selected      INTEGER NOT NULL DEFAULT 1 CHECK(selected IN (0, 1)),
  discovered_at TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- Calendrier PI/Sprint configurable (utilise pour les calculs KPI par PI)
CREATE TABLE IF NOT EXISTS sprint_calendar (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pi_label     TEXT NOT NULL, -- ex: "25-26 PI4"
  sprint_label TEXT NOT NULL, -- ex: "SP1", "SP2", ..., "SP5"
  start_date   TEXT NOT NULL, -- YYYY-MM-DD
  end_date     TEXT NOT NULL, -- YYYY-MM-DD
  active       INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(pi_label, sprint_label)
);

-- Données initiales : 8 équipes
INSERT OR IGNORE INTO teams (name) VALUES
  ('COCO'), ('GO FAHST'), ('JURASSIC BACK'), ('MAGIC SYSTEM'),
  ('MELI MELO'), ('NULL.REF'), ('PIXELS'), ('LACE');

-- Données initiales : 9 règles de conformité (ordre d'affichage dans les paramètres)
INSERT OR IGNORE INTO conformity_rules (code, description, severity, active, rule_config) VALUES
  ('PRIORITY_CHECK',               'Priority doit être 2',                                                     'error',   1, '{}'),
  ('INTEGRATION_BUILD_NOT_EMPTIED','Bugs New/Active doivent avoir Integration Build vide',                     'error',   1, '{}'),
  ('TRIAGE_AREA_CHECK',            'Cohérence zone triage : bugs fermés, sous-classement et produit correct',  'error',   1, '{}'),
  ('BUGS_TRANSVERSE_AREA',         'Bug non Closed dans zone transverse (Etats/GC/Hors-production/Maintenances/Performance/Securite/Tests auto)', 'error', 1, '{}'),
  ('FAH_VERSION_REQUIRED',         'Bugs LIVE (found_in ≥ 14.xx) doivent avoir version souhaitée avec FAH_',  'error',   1, '{}'),
  ('CLOSED_BUG_COHERENCE',         'Bug non-corrigé (Closed) → version & build doivent être "-"',             'error',   1, '{}'),
  ('VERSION_CHECK',                'Format version souhaitée valide selon le type de bug (FAH_ / 12. / 13.8)','error',   1, '{}'),
  ('BUILD_CHECK',                  'Bugs Closed/Resolved doivent avoir un build valide dans la liste connue',  'error',   1, '{}'),
  ('VERSION_BUILD_COHERENCE',      'Cohérence version souhaitée / build (Non concerné, format Patch)',         'error',   1, '{}');
