import { Router } from 'express';
import { getDb } from '../db';

const router = Router();

// Colonnes autorisées pour le tri (whitelist anti-injection)
const SORTABLE_COLUMNS = new Set([
  'id', 'title', 'state', 'priority', 'team', 'sprint', 'sprint_done',
  'found_in', 'integration_build', 'version_souhaitee', 'resolved_reason',
  'assigned_to', 'created_date', 'resolved_date', 'changed_date',
]);

// GET /api/bugs
router.get('/bugs', (req, res) => {
  const db = getDb();

  // Filtres multi-valeurs (valeurs séparées par virgule)
  const teams       = typeof req.query.team        === 'string' && req.query.team        ? req.query.team.split(',').filter(Boolean)        : [];
  const states      = typeof req.query.state       === 'string' && req.query.state       ? req.query.state.split(',').filter(Boolean)       : [];
  const sprints     = typeof req.query.sprint      === 'string' && req.query.sprint      ? req.query.sprint.split(',').filter(Boolean)      : [];
  const sprint_done = typeof req.query.sprint_done === 'string' ? req.query.sprint_done : null;

  // Filtres "contient"
  const title_contains    = typeof req.query.title    === 'string' ? req.query.title.trim()    : null;
  const version_contains  = typeof req.query.version  === 'string' ? req.query.version.trim()  : null;
  const found_in_contains = typeof req.query.found_in === 'string' ? req.query.found_in.trim() : null;
  const build_contains    = typeof req.query.build    === 'string' ? req.query.build.trim()    : null;

  // Tri
  const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : 'changed_date';
  const sort    = SORTABLE_COLUMNS.has(sortRaw) ? sortRaw : 'changed_date';
  const dir     = req.query.dir === 'asc' ? 'ASC' : 'DESC';

  // Pagination
  const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
  const limit  = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (teams.length === 1)   { conditions.push('team = ?');                                   params.push(teams[0]); }
  else if (teams.length > 1){ conditions.push(`team IN (${teams.map(() => '?').join(',')})`); params.push(...teams); }
  if (states.length === 1)  { conditions.push('state = ?');                                  params.push(states[0]); }
  else if (states.length > 1){ conditions.push(`state IN (${states.map(() => '?').join(',')})`); params.push(...states); }
  if (sprints.length === 1) { conditions.push('sprint = ?');                                 params.push(sprints[0]); }
  else if (sprints.length > 1){ conditions.push(`sprint IN (${sprints.map(() => '?').join(',')})`); params.push(...sprints); }
  if (sprint_done) { conditions.push('sprint_done = ?');                    params.push(sprint_done); }
  if (title_contains)    { conditions.push('title LIKE ?');                 params.push(`%${title_contains}%`); }
  if (version_contains)  { conditions.push('version_souhaitee LIKE ?');     params.push(`%${version_contains}%`); }
  if (found_in_contains) { conditions.push('found_in LIKE ?');              params.push(`%${found_in_contains}%`); }
  if (build_contains)    { conditions.push('integration_build LIKE ?');     params.push(`%${build_contains}%`); }

  const oldMonthsRaw = typeof req.query.old_months === 'string' ? parseInt(req.query.old_months, 10) : null;
  const oldMonths    = oldMonthsRaw !== null && !isNaN(oldMonthsRaw) && oldMonthsRaw > 0 ? oldMonthsRaw : null;
  if (oldMonths !== null) {
    conditions.push(`state IN ('New', 'Active')`);
    conditions.push(`created_date <= date('now', '-${oldMonths} months')`);
  }

  const validBugTypes = new Set(['live', 'onpremise', 'hors_version', 'uncategorized']);
  const bugTypes = typeof req.query.bug_type === 'string' && req.query.bug_type
    ? req.query.bug_type.split(',').filter(v => validBugTypes.has(v))
    : [];
  if (bugTypes.length === 1) {
    conditions.push('classify_bug(version_souhaitee, found_in) = ?');
    params.push(bugTypes[0]);
  } else if (bugTypes.length > 1) {
    conditions.push(`classify_bug(version_souhaitee, found_in) IN (${bugTypes.map(() => '?').join(',')})`);
    params.push(...bugTypes);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as n FROM bugs_cache ${where}`).get(...params) as { n: number }).n;

  const bugs = db.prepare(`
    SELECT
      id, title, state, priority, team, area_path, sprint, sprint_done,
      found_in, integration_build, version_souhaitee, resolved_reason,
      raison_origine, assigned_to, created_date, resolved_date, changed_date,
      last_synced_at
    FROM bugs_cache
    ${where}
    ORDER BY ${sort} ${dir}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ total, page, limit, sort, dir, bugs });
});

// GET /api/bugs/meta/teams
router.get('/bugs/meta/teams', (_req, res) => {
  const db = getDb();
  const teams = db.prepare(`SELECT DISTINCT team FROM bugs_cache WHERE team IS NOT NULL ORDER BY team`).all();
  res.json((teams as { team: string }[]).map(r => r.team));
});

// GET /api/bugs/meta/areas — area paths distincts du cache, avec label dérivé
// Utilisé pour alimenter le dropdown de déplacement de zone
router.get('/bugs/meta/areas', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT DISTINCT area_path FROM bugs_cache
    WHERE area_path IS NOT NULL
    ORDER BY area_path
  `).all() as { area_path: string }[];
  res.json(rows.map(r => r.area_path));
});

// GET /api/bugs/meta/sprints
router.get('/bugs/meta/sprints', (_req, res) => {
  const db = getDb();
  const sprints = db.prepare(`SELECT DISTINCT sprint FROM bugs_cache WHERE sprint IS NOT NULL ORDER BY sprint`).all();
  res.json((sprints as { sprint: string }[]).map(r => r.sprint));
});

// GET /api/bugs/:id/audit — historique des écritures ADO pour un bug
router.get('/bugs/:id/audit', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'ID invalide' });
    return;
  }

  const entries = db.prepare(`
    SELECT id, field, old_value, new_value, performed_at
    FROM ado_write_audit
    WHERE work_item_id = ?
    ORDER BY performed_at DESC
  `).all(id);

  res.json(entries);
});

// GET /api/bugs/:id
router.get('/bugs/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'ID invalide' });
    return;
  }

  const bug = db.prepare(`
    SELECT
      id, title, state, priority, team, area_path, iteration_path, sprint, sprint_done,
      found_in, integration_build, version_souhaitee, resolved_reason,
      raison_origine, assigned_to, created_date, resolved_date, changed_date,
      filiere, raw_json, last_synced_at
    FROM bugs_cache WHERE id = ?
  `).get(id);

  if (!bug) {
    res.status(404).json({ error: 'Bug non trouvé' });
    return;
  }

  res.json(bug);
});

export default router;
