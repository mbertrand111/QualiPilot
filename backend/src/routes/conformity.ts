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

// GET /api/conformity/violations
router.get('/conformity/violations', (req, res) => {
  const db = getDb();

  const teams     = typeof req.query.team      === 'string' && req.query.team      ? req.query.team.split(',').filter(Boolean)      : [];
  const codes     = typeof req.query.rule_code === 'string' && req.query.rule_code ? req.query.rule_code.split(',').filter(Boolean) : [];
  const severities= typeof req.query.severity  === 'string' && req.query.severity  ? req.query.severity.split(',').filter(Boolean)  : [];
  const bugIdRaw  = typeof req.query.bug_id    === 'string' && req.query.bug_id    ? parseInt(req.query.bug_id, 10)                 : null;
  const bugId     = bugIdRaw !== null && !isNaN(bugIdRaw) ? bugIdRaw : null;

  const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
  const limit  = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['v.resolved_at IS NULL'];
  const params: unknown[]    = [];

  if (bugId !== null) { conditions.push('v.bug_id = ?'); params.push(bugId); }

  if (teams.length === 1)      { conditions.push('b.team = ?');                                       params.push(teams[0]); }
  else if (teams.length > 1)   { conditions.push(`b.team IN (${teams.map(() => '?').join(',')})`);    params.push(...teams); }
  if (codes.length === 1)      { conditions.push('r.code = ?');                                       params.push(codes[0]); }
  else if (codes.length > 1)   { conditions.push(`r.code IN (${codes.map(() => '?').join(',')})`);    params.push(...codes); }
  if (severities.length === 1) { conditions.push('r.severity = ?');                                   params.push(severities[0]); }
  else if (severities.length > 1){ conditions.push(`r.severity IN (${severities.map(() => '?').join(',')})`); params.push(...severities); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const total = (db.prepare(`
    SELECT COUNT(*) as n
    FROM conformity_violations v
    JOIN bugs_cache b ON b.id = v.bug_id
    JOIN conformity_rules r ON r.id = v.rule_id
    ${where}
  `).get(...params) as { n: number }).n;

  const violations = db.prepare(`
    SELECT
      v.id, v.bug_id, v.detected_at,
      b.title AS bug_title, b.state AS bug_state,
      b.team AS bug_team, b.priority AS bug_priority,
      b.sprint AS bug_sprint,
      b.version_souhaitee AS bug_version_souhaitee,
      b.integration_build AS bug_integration_build,
      b.found_in AS bug_found_in,
      b.area_path AS bug_area_path,
      r.code AS rule_code, r.description AS rule_description, r.severity
    FROM conformity_violations v
    JOIN bugs_cache b ON b.id = v.bug_id
    JOIN conformity_rules r ON r.id = v.rule_id
    ${where}
    ORDER BY v.detected_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ total, page, limit, violations });
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
