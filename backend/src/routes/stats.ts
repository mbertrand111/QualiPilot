import { Router } from 'express';
import { getDb } from '../db';
import { listKpiTeamBacklogHistory } from '../services/kpiHistory';

const router = Router();

// GET /api/stats/auto-fixes
// Retourne les corrections automatiques (par défaut: non validées),
// conservées jusqu'à validation via /ack.
router.get('/stats/auto-fixes', (req, res) => {
  const db = getDb();
  const onlyPending = req.query.only_pending !== '0';

  const lastRun = db.prepare(`
    SELECT
      id,
      trigger_source,
      run_at,
      skipped,
      priority_attempted,
      priority_updated,
      priority_failed,
      integration_attempted,
      integration_updated,
      integration_failed,
      total_updated
    FROM auto_remediation_runs
    ORDER BY datetime(run_at) DESC, id DESC
    LIMIT 1
  `).get() as {
    id: number;
    trigger_source: string;
    run_at: string;
    skipped: number;
    priority_attempted: number;
    priority_updated: number;
    priority_failed: number;
    integration_attempted: number;
    integration_updated: number;
    integration_failed: number;
    total_updated: number;
  } | undefined;

  const effectiveRuleCodeExpr = `
    CASE
      WHEN a.rule_code IS NOT NULL AND TRIM(a.rule_code) <> '' THEN a.rule_code
      WHEN a.field = 'priority' THEN 'PRIORITY_CHECK'
      WHEN a.field = 'integration_build' THEN 'INTEGRATION_BUILD_NOT_EMPTIED'
      ELSE 'UNKNOWN'
    END
  `;

  const baseRowsQuery = `
    SELECT
      a.id,
      a.work_item_id,
      a.field,
      a.old_value,
      a.new_value,
      a.trigger_source,
      a.performed_at,
      a.acknowledged_at,
      ${effectiveRuleCodeExpr} AS rule_code,
      COALESCE(r.description, ${effectiveRuleCodeExpr}) AS rule_description
    FROM auto_fix_audit a
    LEFT JOIN conformity_rules r ON r.code = ${effectiveRuleCodeExpr}
  `;

  const whereParts: string[] = [];
  const params: unknown[] = [];
  if (onlyPending) whereParts.push('a.acknowledged_at IS NULL');

  const rows = db.prepare(`
    ${baseRowsQuery}
    ${whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''}
    ORDER BY datetime(a.performed_at) DESC, a.id DESC
    LIMIT 300
  `).all(...params) as {
    id: number;
    work_item_id: number;
    field: string;
    old_value: string | null;
    new_value: string | null;
    trigger_source: string;
    performed_at: string;
    acknowledged_at: string | null;
    rule_code: string;
    rule_description: string;
  }[];

  const pending = (db.prepare(`
    SELECT COUNT(*) AS n
    FROM auto_fix_audit
    WHERE acknowledged_at IS NULL
  `).get() as { n: number }).n;

  res.json({
    pending,
    rows,
    lastRun: lastRun
      ? {
          id: lastRun.id,
          trigger_source: lastRun.trigger_source,
          run_at: lastRun.run_at,
          skipped: lastRun.skipped === 1,
          priority: {
            attempted: lastRun.priority_attempted,
            updated: lastRun.priority_updated,
            failed: lastRun.priority_failed,
          },
          integration_build: {
            attempted: lastRun.integration_attempted,
            updated: lastRun.integration_updated,
            failed: lastRun.integration_failed,
          },
          total_updated: lastRun.total_updated,
        }
      : null,
  });
});

// POST /api/stats/auto-fixes/ack
// Valide (et retire du tableau) les corrections auto, toutes ou un sous-ensemble d'IDs.
router.post('/stats/auto-fixes/ack', (req, res) => {
  const db = getDb();
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((v: unknown) => parseInt(String(v), 10)).filter((n: number) => Number.isFinite(n) && n > 0)
    : [];

  let acknowledged = 0;
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE auto_fix_audit
      SET acknowledged_at = datetime('now')
      WHERE acknowledged_at IS NULL
        AND id IN (${placeholders})
    `);
    const result = stmt.run(...ids);
    acknowledged = result.changes;
  } else {
    const result = db.prepare(`
      UPDATE auto_fix_audit
      SET acknowledged_at = datetime('now')
      WHERE acknowledged_at IS NULL
    `).run();
    acknowledged = result.changes;
  }

  res.json({ acknowledged });
});

// GET /api/stats/kpi-history
// Historique des snapshots "Backlogs équipes" + compteur "Bugs à corriger LIVE".
router.get('/stats/kpi-history', (req, res) => {
  try {
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
    const history = listKpiTeamBacklogHistory(limitRaw);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

// GET /api/stats/home
// Returns open bug counts by type + resolved bugs + total active violations
router.get('/stats/home', (_req, res) => {
  const db = getDb();

  const rows = db.prepare(`
    SELECT classify_bug(version_souhaitee, found_in) AS bug_type, COUNT(*) AS count
    FROM bugs_cache
    WHERE state IN ('New', 'Active')
    GROUP BY bug_type
  `).all() as { bug_type: string; count: number }[];

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    counts[row.bug_type] = row.count;
    total += row.count;
  }

  const anomalies = (db.prepare(`
    SELECT COUNT(*) AS n FROM conformity_violations WHERE resolved_at IS NULL
  `).get() as { n: number }).n;

  const resolved = (db.prepare(`
    SELECT COUNT(*) AS n FROM bugs_cache WHERE state = 'Resolved'
  `).get() as { n: number }).n;

  res.json({
    open_bugs: {
      total,
      live:          counts['live']          ?? 0,
      onpremise:     counts['onpremise']      ?? 0,
      hors_version:  counts['hors_version']   ?? 0,
      uncategorized: counts['uncategorized']  ?? 0,
    },
    resolved_bugs: { total: resolved },
    anomalies: { total: anomalies },
  });
});

// GET /api/stats/triage
// Counts per triage zone, with the same optional filters as /api/bugs
// (state, sprint, bug_type, title, version, found_in, build)
// Note: team filter is intentionally excluded — zones ARE the team grouping here
router.get('/stats/triage', (req, res) => {
  const db = getDb();
  const FILIERE_SQL = `CASE
    WHEN UPPER(COALESCE(title, '')) LIKE '%[CO]%' THEN 'CO'
    WHEN UPPER(COALESCE(title, '')) LIKE '%[IW]%' THEN 'IW'
    ELSE 'GC'
  END`;

  const conditions: string[] = [];
  const params: unknown[]    = [];

  // state
  const states = typeof req.query.state === 'string' && req.query.state
    ? req.query.state.split(',').filter(Boolean) : [];
  if (states.length === 1)   { conditions.push('state = ?');                                      params.push(states[0]); }
  else if (states.length > 1){ conditions.push(`state IN (${states.map(() => '?').join(',')})`);  params.push(...states); }

  // sprint
  const sprints = typeof req.query.sprint === 'string' && req.query.sprint
    ? req.query.sprint.split(',').filter(Boolean) : [];
  if (sprints.length === 1)   { conditions.push('sprint = ?');                                       params.push(sprints[0]); }
  else if (sprints.length > 1){ conditions.push(`sprint IN (${sprints.map(() => '?').join(',')})`);  params.push(...sprints); }

  // filiere
  const filieres = typeof req.query.filiere === 'string' && req.query.filiere
    ? req.query.filiere
        .split(',')
        .map((v) => v.trim().toUpperCase())
        .filter((v) => v === 'GC' || v === 'CO' || v === 'IW')
    : [];
  if (filieres.length === 1)   { conditions.push(`${FILIERE_SQL} = ?`);                                      params.push(filieres[0]); }
  else if (filieres.length > 1){ conditions.push(`${FILIERE_SQL} IN (${filieres.map(() => '?').join(',')})`); params.push(...filieres); }

  // bug_type via SQLite custom function
  const validBugTypes = new Set(['live', 'onpremise', 'hors_version', 'uncategorized']);
  const bugTypes = typeof req.query.bug_type === 'string' && req.query.bug_type
    ? req.query.bug_type.split(',').filter(v => validBugTypes.has(v)) : [];
  if (bugTypes.length === 1)   { conditions.push('classify_bug(version_souhaitee, found_in) = ?');                                               params.push(bugTypes[0]); }
  else if (bugTypes.length > 1){ conditions.push(`classify_bug(version_souhaitee, found_in) IN (${bugTypes.map(() => '?').join(',')})`);         params.push(...bugTypes); }

  // text filters
  const titleContains   = typeof req.query.title    === 'string' ? req.query.title.trim()    : null;
  const versionContains = typeof req.query.version  === 'string' ? req.query.version.trim()  : null;
  const foundInContains = typeof req.query.found_in === 'string' ? req.query.found_in.trim() : null;
  const buildContains   = typeof req.query.build    === 'string' ? req.query.build.trim()    : null;
  if (titleContains)   { conditions.push('title LIKE ?');             params.push(`%${titleContains}%`); }
  if (versionContains) { conditions.push('version_souhaitee LIKE ?'); params.push(`%${versionContains}%`); }
  if (foundInContains) { conditions.push('found_in LIKE ?');          params.push(`%${foundInContains}%`); }
  if (buildContains)   { conditions.push('integration_build LIKE ?'); params.push(`%${buildContains}%`); }

  const extraWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  const areaCounts = db.prepare(`
    SELECT team, COUNT(*) AS count
    FROM bugs_cache
    WHERE team IN ('Bugs à prioriser', 'Bugs à corriger LIVE', 'Bugs à corriger OnPremise', 'Bugs à corriger Hors versions', 'Bugs à corriger')
    ${extraWhere}
    GROUP BY team
  `).all(...params) as { team: string; count: number }[];

  const byTeam: Record<string, number> = {};
  for (const row of areaCounts) byTeam[row.team] = row.count;

  // old_6months : applique les mêmes filtres + condition date/state ouverts
  const oldConditions = [...conditions, `state IN ('New', 'Active')`, `created_date <= date('now', '-6 months')`];
  const oldBugs = (db.prepare(`
    SELECT COUNT(*) AS n FROM bugs_cache
    WHERE ${oldConditions.join(' AND ')}
  `).get(...params) as { n: number }).n;

  res.json({
    prioritiser:           byTeam['Bugs à prioriser']              ?? 0,
    corriger_live:         byTeam['Bugs à corriger LIVE']          ?? 0,
    corriger_onpremise:    byTeam['Bugs à corriger OnPremise']     ?? 0,
    corriger_hors_version: byTeam['Bugs à corriger Hors versions'] ?? 0,
    corriger_sans_zone:    byTeam['Bugs à corriger']               ?? 0,
    old_6months:           oldBugs,
  });
});

export default router;
