import { Router } from 'express';
import { getDb } from '../db';

const router = Router();

// GET /api/stats/home
// Returns open bug counts by type + total active violations
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

  res.json({
    open_bugs: {
      total,
      live:          counts['live']          ?? 0,
      onpremise:     counts['onpremise']      ?? 0,
      hors_version:  counts['hors_version']   ?? 0,
      uncategorized: counts['uncategorized']  ?? 0,
    },
    anomalies: { total: anomalies },
  });
});

// GET /api/stats/triage
// Counts per triage zone, with the same optional filters as /api/bugs
// (state, sprint, bug_type, title, version, found_in, build)
// Note: team filter is intentionally excluded — zones ARE the team grouping here
router.get('/stats/triage', (req, res) => {
  const db = getDb();

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
