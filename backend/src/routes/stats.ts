import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import { listKpiTeamBacklogHistory } from '../services/kpiHistory';
import { requireApiKey } from '../middleware/security';

const AckSchema = z.object({
  ids: z.array(z.number().int().positive()).optional(),
});

// Plage de dates pour /manual-fixes — from inclusif, to exclusif (fin de journée gérée côté SQL).
const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from doit être au format YYYY-MM-DD'),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to doit être au format YYYY-MM-DD'),
});

const ManualFixesDetailSchema = DateRangeSchema.extend({
  team: z.string().min(1, 'team est obligatoire'),
});

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
router.post('/stats/auto-fixes/ack', requireApiKey, (req, res) => {
  const parsed = AckSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  const db = getDb();
  const ids = parsed.data.ids ?? [];

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
// Tableau de bord — agrégats par section :
//   1. open_bugs : bugs ouverts par type
//   2. triage    : bugs en zones de triage non assignées
//   3. resolved_bugs / anomalies / trend_7d : zone de vigilance
//   4. old_bugs  : bugs ouverts depuis +6 mois, ventilés par type
router.get('/stats/home', (_req, res) => {
  const db = getDb();

  // Section 1 — Bugs ouverts par type
  const openRows = db.prepare(`
    SELECT classify_bug(version_souhaitee, found_in, integration_build, raison_origine, title) AS bug_type, COUNT(*) AS count
    FROM bugs_cache
    WHERE state IN ('New', 'Active')
    GROUP BY bug_type
  `).all() as { bug_type: string; count: number }[];

  const openCounts: Record<string, number> = {};
  let openTotal = 0;
  for (const row of openRows) {
    openCounts[row.bug_type] = row.count;
    openTotal += row.count;
  }

  // Section 2 — Zones de triage (bugs non répartis dans les équipes)
  // On ne compte que les bugs ouverts : un bug Closed/Resolved en zone de triage ne demande plus d'action.
  const triageRows = db.prepare(`
    SELECT team, COUNT(*) AS count
    FROM bugs_cache
    WHERE team IN ('Bugs à prioriser', 'Bugs à corriger LIVE', 'Bugs à corriger OnPremise', 'Bugs à corriger Hors versions')
      AND state IN ('New', 'Active')
    GROUP BY team
  `).all() as { team: string; count: number }[];

  const byTeam: Record<string, number> = {};
  for (const row of triageRows) byTeam[row.team] = row.count;

  // Section 3 — Vigilance
  const anomalies = (db.prepare(`
    SELECT COUNT(*) AS n FROM conformity_violations WHERE resolved_at IS NULL
  `).get() as { n: number }).n;

  const resolved = (db.prepare(`
    SELECT COUNT(*) AS n FROM bugs_cache WHERE state = 'Resolved'
  `).get() as { n: number }).n;

  // resolved_date peut être NULL pour les anciens imports → fallback sur changed_date
  const resolvedOld = (db.prepare(`
    SELECT COUNT(*) AS n FROM bugs_cache
    WHERE state = 'Resolved'
      AND COALESCE(resolved_date, changed_date) <= date('now', '-5 days')
  `).get() as { n: number }).n;

  const trend = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM bugs_cache WHERE created_date >= date('now', '-7 days')) AS created,
      (SELECT COUNT(*) FROM bugs_cache
        WHERE state IN ('Resolved', 'Closed')
          AND COALESCE(resolved_date, closed_date, changed_date) >= date('now', '-7 days')) AS resolved
  `).get() as { created: number; resolved: number };

  // Section 4 — Bugs anciens (>6 mois) par type de version
  const oldRows = db.prepare(`
    SELECT classify_bug(version_souhaitee, found_in, integration_build, raison_origine, title) AS bug_type, COUNT(*) AS count
    FROM bugs_cache
    WHERE state IN ('New', 'Active')
      AND created_date <= date('now', '-6 months')
    GROUP BY bug_type
  `).all() as { bug_type: string; count: number }[];

  const oldCounts: Record<string, number> = {};
  for (const row of oldRows) oldCounts[row.bug_type] = row.count;

  res.json({
    open_bugs: {
      total:         openTotal,
      live:          openCounts['live']          ?? 0,
      onpremise:     openCounts['onpremise']     ?? 0,
      hors_version:  openCounts['hors_version']  ?? 0,
      uncategorized: openCounts['uncategorized'] ?? 0,
    },
    triage: {
      prioritiser:           byTeam['Bugs à prioriser']              ?? 0,
      corriger_live:         byTeam['Bugs à corriger LIVE']          ?? 0,
      corriger_onpremise:    byTeam['Bugs à corriger OnPremise']     ?? 0,
      corriger_hors_version: byTeam['Bugs à corriger Hors versions'] ?? 0,
    },
    resolved_bugs: { total: resolved, older_than_5d: resolvedOld },
    anomalies: { total: anomalies },
    trend_7d: { created: trend.created, resolved: trend.resolved },
    old_bugs: {
      live:      oldCounts['live']      ?? 0,
      onpremise: oldCounts['onpremise'] ?? 0,
      other:     (oldCounts['hors_version'] ?? 0) + (oldCounts['uncategorized'] ?? 0),
    },
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
  if (bugTypes.length === 1)   { conditions.push('classify_bug(version_souhaitee, found_in, integration_build, raison_origine, title) = ?');                                               params.push(bugTypes[0]); }
  else if (bugTypes.length > 1){ conditions.push(`classify_bug(version_souhaitee, found_in, integration_build, raison_origine, title) IN (${bugTypes.map(() => '?').join(',')})`);         params.push(...bugTypes); }

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

// GET /api/stats/manual-fixes/summary
// Résumé par équipe : nombre de bugs modifiés manuellement dans [from, to[ qui avaient une anomalie.
// Exclusion des corrections auto via LEFT JOIN sur auto_fix_audit (matching work_item_id + field + performed_at).
router.get('/stats/manual-fixes/summary', (req, res) => {
  const parsed = DateRangeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  const { from, to } = parsed.data;
  // `to` est inclusif côté UI → on transforme en borne exclusive = lendemain.
  const toExclusive = new Date(`${to}T00:00:00Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIso = toExclusive.toISOString().slice(0, 10);

  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT b.team AS team, COUNT(DISTINCT a.work_item_id) AS count
      FROM ado_write_audit a
      JOIN bugs_cache b ON b.id = a.work_item_id
      LEFT JOIN auto_fix_audit af
        ON af.work_item_id = a.work_item_id
       AND af.field = a.field
       AND af.performed_at = a.performed_at
      WHERE af.id IS NULL
        AND a.performed_at >= ?
        AND a.performed_at < ?
        AND b.team IS NOT NULL AND b.team <> ''
        AND EXISTS (
          SELECT 1 FROM conformity_violations v
          WHERE v.bug_id = a.work_item_id
            AND v.detected_at <= a.performed_at
        )
      GROUP BY b.team
      ORDER BY count DESC, b.team ASC
    `).all(from, toIso) as { team: string; count: number }[];

    res.json({ from, to, rows });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

// GET /api/stats/manual-fixes/detail
// Liste des bugs d'une équipe modifiés manuellement dans [from, to[.
router.get('/stats/manual-fixes/detail', (req, res) => {
  const parsed = ManualFixesDetailSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  const { from, to, team } = parsed.data;
  const toExclusive = new Date(`${to}T00:00:00Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIso = toExclusive.toISOString().slice(0, 10);

  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        a.work_item_id                                  AS id,
        b.title                                         AS title,
        b.state                                         AS state,
        MAX(a.performed_at)                             AS last_modified_at,
        GROUP_CONCAT(DISTINCT a.field)                  AS fields_modified,
        (SELECT GROUP_CONCAT(DISTINCT r.code)
           FROM conformity_violations v
           JOIN conformity_rules r ON r.id = v.rule_id
          WHERE v.bug_id = a.work_item_id
            AND v.detected_at <= MAX(a.performed_at))   AS violations_at_time
      FROM ado_write_audit a
      JOIN bugs_cache b ON b.id = a.work_item_id
      LEFT JOIN auto_fix_audit af
        ON af.work_item_id = a.work_item_id
       AND af.field = a.field
       AND af.performed_at = a.performed_at
      WHERE af.id IS NULL
        AND a.performed_at >= ?
        AND a.performed_at < ?
        AND b.team = ?
        AND EXISTS (
          SELECT 1 FROM conformity_violations v
          WHERE v.bug_id = a.work_item_id
            AND v.detected_at <= a.performed_at
        )
      GROUP BY a.work_item_id, b.title, b.state
      ORDER BY last_modified_at DESC
    `).all(from, toIso, team) as {
      id: number;
      title: string | null;
      state: string | null;
      last_modified_at: string;
      fields_modified: string | null;
      violations_at_time: string | null;
    }[];

    res.json({
      from, to, team,
      bugs: rows.map(r => ({
        id: r.id,
        title: r.title,
        state: r.state,
        last_modified_at: r.last_modified_at,
        fields_modified: r.fields_modified ? r.fields_modified.split(',') : [],
        violations_at_time: r.violations_at_time ? r.violations_at_time.split(',') : [],
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

export default router;
