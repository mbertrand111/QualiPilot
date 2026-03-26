import { Router } from 'express';
import { getDb } from '../db';
import { runConformityCheck } from '../services/conformity';

const router = Router();

// POST /api/conformity/run
router.post('/conformity/run', (_req, res) => {
  try {
    const result = runConformityCheck();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inconnue' });
  }
});

const VIOLATION_SORTABLE: Record<string, string> = {
  bug_id:            'b.id',
  team:              'b.team',
  state:             'b.state',
  priority:          'b.priority',
  version_souhaitee: 'b.version_souhaitee',
  integration_build: 'b.integration_build',
  changed_date:      'b.changed_date',
};

// GET /api/conformity/violations
// Retourne un bug par ligne (dédupliqué) + rule_counts pour les chips de filtre.
router.get('/conformity/violations', (req, res) => {
  const db = getDb();

  const teams     = typeof req.query.team      === 'string' && req.query.team      ? req.query.team.split(',').filter(Boolean)      : [];
  const codes     = typeof req.query.rule_code === 'string' && req.query.rule_code ? req.query.rule_code.split(',').filter(Boolean) : [];
  const states    = typeof req.query.state     === 'string' && req.query.state     ? req.query.state.split(',').filter(Boolean)     : [];
  const bugIdRaw  = typeof req.query.bug_id    === 'string' && req.query.bug_id    ? parseInt(req.query.bug_id, 10)                 : null;
  const bugId     = bugIdRaw !== null && !isNaN(bugIdRaw) ? bugIdRaw : null;

  const titleContains   = typeof req.query.title    === 'string' ? req.query.title.trim()    : null;
  const versionContains = typeof req.query.version  === 'string' ? req.query.version.trim()  : null;
  const foundInContains = typeof req.query.found_in === 'string' ? req.query.found_in.trim() : null;
  const buildContains   = typeof req.query.build    === 'string' ? req.query.build.trim()    : null;

  const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : 'changed_date';
  const sortCol = VIOLATION_SORTABLE[sortRaw] ?? 'b.changed_date';
  const dir     = req.query.dir === 'asc' ? 'ASC' : 'DESC';

  const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
  const limit  = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
  const offset = (page - 1) * limit;

  // Conditions de base (sans filtre règle) — utilisées pour rule_counts
  const baseConditions: string[] = ['v.resolved_at IS NULL'];
  const baseParams: unknown[]    = [];

  if (bugId !== null) { baseConditions.push('v.bug_id = ?'); baseParams.push(bugId); }

  if (teams.length === 1)   { baseConditions.push('b.team = ?');                                     baseParams.push(teams[0]); }
  else if (teams.length > 1){ baseConditions.push(`b.team IN (${teams.map(() => '?').join(',')})`);  baseParams.push(...teams); }
  if (states.length === 1)   { baseConditions.push('b.state = ?');                                    baseParams.push(states[0]); }
  else if (states.length > 1){ baseConditions.push(`b.state IN (${states.map(() => '?').join(',')})`); baseParams.push(...states); }

  if (titleContains)   { baseConditions.push('b.title LIKE ?');             baseParams.push(`%${titleContains}%`); }
  if (versionContains) { baseConditions.push('b.version_souhaitee LIKE ?'); baseParams.push(`%${versionContains}%`); }
  if (foundInContains) { baseConditions.push('b.found_in LIKE ?');          baseParams.push(`%${foundInContains}%`); }
  if (buildContains)   { baseConditions.push('b.integration_build LIKE ?'); baseParams.push(`%${buildContains}%`); }

  // Conditions complètes (avec filtre règle) — utilisées pour la requête principale
  const conditions = [...baseConditions];
  const params     = [...baseParams];

  if (codes.length === 1)   { conditions.push('r.code = ?');                                      params.push(codes[0]); }
  else if (codes.length > 1){ conditions.push(`r.code IN (${codes.map(() => '?').join(',')})`);   params.push(...codes); }

  const baseWhere = `WHERE ${baseConditions.join(' AND ')}`;
  const where     = `WHERE ${conditions.join(' AND ')}`;

  const joins = `
    FROM conformity_violations v
    JOIN bugs_cache b ON b.id = v.bug_id
    JOIN conformity_rules r ON r.id = v.rule_id
  `;

  // Mode détail (bug_id fourni) : retourne les violations individuelles avec infos règle
  if (bugId !== null) {
    const violations = db.prepare(`
      SELECT
        v.id, v.detected_at,
        r.code AS rule_code, r.description AS rule_description, r.severity
      ${joins} ${where}
      ORDER BY v.detected_at ASC
    `).all(...params) as { id: number; detected_at: string; rule_code: string; rule_description: string; severity: string }[];

    return res.json({ total: violations.length, page: 1, limit: violations.length, violations, rule_counts: [] });
  }

  // Mode liste : bugs dédupliqués (1 ligne par bug)
  const total = (db.prepare(`
    SELECT COUNT(DISTINCT b.id) AS n ${joins} ${where}
  `).get(...params) as { n: number }).n;

  const violations = db.prepare(`
    SELECT
      b.id AS bug_id,
      b.title AS bug_title,
      b.state AS bug_state,
      b.team AS bug_team,
      b.priority AS bug_priority,
      b.version_souhaitee AS bug_version_souhaitee,
      b.integration_build AS bug_integration_build,
      b.found_in AS bug_found_in,
      b.changed_date AS bug_changed_date
    ${joins} ${where}
    GROUP BY b.id
    ORDER BY ${sortCol} ${dir}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // Comptage par règle (sans filtre règle, pour les chips de filtre)
  const rule_counts = db.prepare(`
    SELECT r.code AS rule_code, COUNT(DISTINCT v.bug_id) AS count
    ${joins} ${baseWhere}
    GROUP BY r.code
    ORDER BY count DESC
  `).all(...baseParams) as { rule_code: string; count: number }[];

  res.json({ total, page, limit, sort: sortRaw, dir: dir.toLowerCase(), violations, rule_counts });
});

// GET /api/conformity/summary
router.get('/conformity/summary', (_req, res) => {
  const db = getDb();

  const total = (db.prepare(`
    SELECT COUNT(*) as n FROM conformity_violations WHERE resolved_at IS NULL
  `).get() as { n: number }).n;

  const byRule = db.prepare(`
    SELECT r.code AS rule_code, r.description AS rule_description, r.severity, COUNT(*) as count
    FROM conformity_violations v
    JOIN conformity_rules r ON r.id = v.rule_id
    WHERE v.resolved_at IS NULL
    GROUP BY r.id
    ORDER BY count DESC
  `).all();

  const byTeam = db.prepare(`
    SELECT b.team, COUNT(*) as count
    FROM conformity_violations v
    JOIN bugs_cache b ON b.id = v.bug_id
    WHERE v.resolved_at IS NULL AND b.team IS NOT NULL
    GROUP BY b.team
    ORDER BY count DESC
  `).all();

  const lastRow = db.prepare(`
    SELECT MAX(detected_at) as lastRunAt
    FROM conformity_violations
    WHERE resolved_at IS NULL
  `).get() as { lastRunAt: string | null };

  res.json({
    total,
    by_rule: byRule,
    by_team: byTeam,
    lastRunAt: lastRow?.lastRunAt ?? null,
  });
});

export default router;
