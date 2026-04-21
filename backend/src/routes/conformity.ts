import { Router } from 'express';
import ExcelJS from 'exceljs';
import { getDb } from '../db';
import { runConformityCheck } from '../services/conformity';
import { requireApiKey } from '../middleware/security';

const ADO_EDIT_BASE = 'https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/';

// Mapping règle → champs en anomalie (pour coloration rouge dans l'export)
const RULE_TO_FIELDS: Record<string, string[]> = {
  PRIORITY_CHECK:              ['priority'],
  VERSION_CHECK:               ['version_souhaitee'],
  BUILD_CHECK:                 ['integration_build'],
  VERSION_BUILD_COHERENCE:     ['version_souhaitee', 'integration_build'],
  CLOSED_BUG_COHERENCE:        ['version_souhaitee', 'integration_build'],
  FAH_VERSION_REQUIRED:        ['version_souhaitee'],
  TRIAGE_AREA_CHECK:           ['version_souhaitee', 'integration_build'],
  NON_CLOSED_TRANSVERSE_AREA:  [],
};

type ExportBugRow = {
  bug_version_souhaitee: string | null;
  bug_state: string | null;
  bug_found_in: string | null;
  bug_integration_build: string | null;
  bug_priority: number | null;
};

function getRuleExplanation(code: string, row: ExportBugRow): string {
  const v       = (row.bug_version_souhaitee ?? '').trim();
  const state   = (row.bug_state ?? '').trim().toLowerCase();
  const foundIn = (row.bug_found_in ?? '').trim();
  const build   = (row.bug_integration_build ?? '').trim();

  switch (code) {
    case 'PRIORITY_CHECK':
      return `Attendu : Priorité 2 (actuelle : ${row.bug_priority ?? '?'})`;

    case 'VERSION_CHECK': {
      const isOnPrem = (foundIn.startsWith('13.') && !foundIn.startsWith('13.99')) || foundIn.startsWith('12.');
      if (isOnPrem) {
        if (/^13\.87\.XXX/i.test(v) && (state === 'closed' || state === 'resolved'))
          return 'Version précise requise à la clôture (13.87.XXX interdit)';
        if (/patch/i.test(v) && !/^13\.8[67]\.\d+\s+Patch\s+\d+$/i.test(v))
          return 'Format attendu : 13.87.nnn Patch Z (Z numérique)';
        return 'Format attendu : 13.86.nnn ou 13.87.nnn';
      }
      const fahMatch = v.match(/^FAH_\d{2}\.(\d+)/i);
      if (fahMatch && parseInt(fahMatch[1], 10) % 5 !== 0)
        return 'Format attendu : FAH_XX.yy (yy = 10, 20, 30…)';
      if (/FAH_/i.test(v) && /patch/i.test(v))
        return 'Format attendu : FAH_XX.yy Patch Z';
      return 'Format attendu : FAH_XX.yy';
    }

    case 'BUILD_CHECK':
      if (!build) return "Build d'intégration obligatoire";
      if (/\b(patch|hotfix|fix|rc|beta|alpha)\b/i.test(build)) return 'Format invalide (mot-clé interdit dans le build)';
      return 'Build non reconnu (préfixe invalide)';

    case 'VERSION_BUILD_COHERENCE': {
      const isOnPrem = foundIn.startsWith('13.') && !foundIn.startsWith('13.99');
      if (isOnPrem && /^FAH_/i.test(v) && !/\/\s*live/i.test(foundIn))
        return 'Incohérence produit : Found In OnPremise + version Live (ajouter «/ live» si migré)';
      if (/patch/i.test(v)) return 'Build incohérent avec le patch de la version souhaitée';
      return 'Build incohérent avec la version souhaitée';
    }

    case 'CLOSED_BUG_COHERENCE': {
      const msgs: string[] = [];
      if (v && v !== '-') msgs.push('version doit être «-»');
      if (build && build !== '-') msgs.push('build doit être «-»');
      return `Bug fermé sans correction : ${msgs.join(' et ')}`;
    }

    case 'FAH_VERSION_REQUIRED':
      return 'Found In FAH récent → version souhaitée doit contenir FAH';

    case 'TRIAGE_AREA_CHECK':
    case 'NON_CLOSED_TRANSVERSE_AREA':
      return 'Zone ou sous-dossier incohérent avec le type de bug';

    default:
      return code;
  }
}

const router = Router();

// POST /api/conformity/run
router.post('/conformity/run', requireApiKey, (_req, res) => {
  try {
    const result = runConformityCheck();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inconnue' });
  }
});

// POST /api/conformity/waivers
// Accepte manuellement une anomalie (bug + règle) pour qu'elle ne remonte plus.
router.post('/conformity/waivers', requireApiKey, (req, res) => {
  const db = getDb();
  const bugIdRaw = req.body?.bug_id;
  const ruleCode = typeof req.body?.rule_code === 'string' ? req.body.rule_code.trim() : '';
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;

  const bugId = typeof bugIdRaw === 'number' ? bugIdRaw : parseInt(String(bugIdRaw ?? ''), 10);
  if (!Number.isFinite(bugId) || bugId <= 0) {
    return res.status(400).json({ error: 'bug_id invalide' });
  }
  if (!ruleCode) {
    return res.status(400).json({ error: 'rule_code obligatoire' });
  }

  const bug = db.prepare(`SELECT id FROM bugs_cache WHERE id = ?`).get(bugId) as { id: number } | undefined;
  if (!bug) {
    return res.status(404).json({ error: 'Bug non trouve' });
  }

  const rule = db.prepare(`SELECT id, code FROM conformity_rules WHERE code = ?`).get(ruleCode) as { id: number; code: string } | undefined;
  if (!rule) {
    return res.status(404).json({ error: 'Regle inconnue' });
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO conformity_waivers (bug_id, rule_id, reason, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(bug_id, rule_id) DO UPDATE SET reason = excluded.reason
    `).run(bugId, rule.id, reason);

    db.prepare(`
      UPDATE conformity_violations
      SET resolved_at = datetime('now')
      WHERE bug_id = ? AND rule_id = ? AND resolved_at IS NULL
    `).run(bugId, rule.id);
  })();

  res.json({ ok: true, bug_id: bugId, rule_code: rule.code });
});

const VIOLATION_SORTABLE: Record<string, string> = {
  bug_id:          'b.id',
  team:            'b.team',
  state:           'b.state',
  priority:        'b.priority',
  resolved_reason: 'b.resolved_reason',
  version_souhaitee: 'b.version_souhaitee',
  integration_build: 'b.integration_build',
  changed_date:    'b.changed_date',
};

const ZONE_ALIASES: Record<string, string[]> = {
  'Bugs à corriger LIVE': ['Bugs à corriger LIVE', 'Bugs à corriger\\Versions LIVE'],
  'Bugs à corriger OnPremise': ['Bugs à corriger OnPremise', 'Bugs à corriger\\Versions historiques'],
  'Bugs à corriger Hors versions': ['Bugs à corriger Hors versions', 'Bugs à corriger\\Hors versions'],
  Etats: ['Etats', 'États'],
  'Sécurité': ['Sécurité', 'Securite'],
  'Hors-production': ['Hors-production', 'Hors production'],
};

function zoneCandidates(zone: string): string[] {
  const trimmed = zone.trim();
  if (!trimmed) return [];
  const aliases = ZONE_ALIASES[trimmed] ?? [trimmed];
  return [...new Set(aliases)];
}

// GET /api/conformity/violations
// Retourne un bug par ligne (dédupliqué) + rule_counts pour les chips de filtre.
router.get('/conformity/violations', (req, res) => {
  const db = getDb();

  const teams     = typeof req.query.team      === 'string' && req.query.team      ? req.query.team.split(',').filter(Boolean)      : [];
  const zones     = typeof req.query.zone      === 'string' && req.query.zone      ? req.query.zone.split(',').filter(Boolean)      : [];
  const codes     = typeof req.query.rule_code === 'string' && req.query.rule_code ? req.query.rule_code.split(',').filter(Boolean) : [];
  const states    = typeof req.query.state     === 'string' && req.query.state     ? req.query.state.split(',').filter(Boolean)     : [];
  const sprints   = typeof req.query.sprint    === 'string' && req.query.sprint    ? req.query.sprint.split(',').filter(Boolean)    : [];

  const validBugTypes = new Set(['live', 'onpremise', 'hors_version', 'uncategorized']);
  const bugTypes  = typeof req.query.bug_type  === 'string' && req.query.bug_type
    ? req.query.bug_type.split(',').filter(v => validBugTypes.has(v)) : [];
  const bugIdRaw  = typeof req.query.bug_id    === 'string' && req.query.bug_id    ? parseInt(req.query.bug_id, 10)                 : null;
  const bugId     = bugIdRaw !== null && !isNaN(bugIdRaw) ? bugIdRaw : null;

  const idContains      = typeof req.query.id       === 'string' ? req.query.id.trim()       : null;
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
  const baseConditions: string[] = [
    'v.resolved_at IS NULL',
    'NOT EXISTS (SELECT 1 FROM conformity_waivers w WHERE w.bug_id = v.bug_id AND w.rule_id = v.rule_id)',
  ];
  const baseParams: unknown[]    = [];

  if (bugId !== null) { baseConditions.push('v.bug_id = ?'); baseParams.push(bugId); }

  if (teams.length === 1)    { baseConditions.push('b.team = ?');                                      baseParams.push(teams[0]); }
  else if (teams.length > 1) { baseConditions.push(`b.team IN (${teams.map(() => '?').join(',')})`);   baseParams.push(...teams); }
  if (zones.length > 0) {
    const zoneParts: string[] = [];
    for (const zone of zones) {
      for (const candidate of zoneCandidates(zone)) {
        zoneParts.push('(b.area_path = ? OR b.area_path LIKE ? OR b.area_path LIKE ?)');
        baseParams.push(candidate, `%\\${candidate}`, `%\\${candidate}\\%`);
      }
    }
    if (zoneParts.length > 0) {
      baseConditions.push(`(${zoneParts.join(' OR ')})`);
    }
  }
  if (states.length === 1)   { baseConditions.push('b.state = ?');                                     baseParams.push(states[0]); }
  else if (states.length > 1){ baseConditions.push(`b.state IN (${states.map(() => '?').join(',')})`); baseParams.push(...states); }
  if (sprints.length === 1)   { baseConditions.push('b.sprint = ?');                                    baseParams.push(sprints[0]); }
  else if (sprints.length > 1){ baseConditions.push(`b.sprint IN (${sprints.map(() => '?').join(',')})`); baseParams.push(...sprints); }
  if (bugTypes.length === 1)   { baseConditions.push('classify_bug(b.version_souhaitee, b.found_in, b.integration_build, b.raison_origine, b.title) = ?');                                              baseParams.push(bugTypes[0]); }
  else if (bugTypes.length > 1){ baseConditions.push(`classify_bug(b.version_souhaitee, b.found_in, b.integration_build, b.raison_origine, b.title) IN (${bugTypes.map(() => '?').join(',')})`);        baseParams.push(...bugTypes); }

  if (idContains)      { baseConditions.push("CAST(b.id AS TEXT) LIKE ?");  baseParams.push(`%${idContains}%`); }
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
      b.resolved_reason AS bug_resolved_reason,
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

// GET /api/conformity/violations/export — téléchargement Excel avec filtres + tri courants
router.get('/conformity/violations/export', (req, res) => {
  const db = getDb();

  // Mêmes filtres que /conformity/violations
  const teams     = typeof req.query.team      === 'string' && req.query.team      ? req.query.team.split(',').filter(Boolean)      : [];
  const zones     = typeof req.query.zone      === 'string' && req.query.zone      ? req.query.zone.split(',').filter(Boolean)      : [];
  const codes     = typeof req.query.rule_code === 'string' && req.query.rule_code ? req.query.rule_code.split(',').filter(Boolean) : [];
  const states    = typeof req.query.state     === 'string' && req.query.state     ? req.query.state.split(',').filter(Boolean)     : [];
  const sprints   = typeof req.query.sprint    === 'string' && req.query.sprint    ? req.query.sprint.split(',').filter(Boolean)    : [];

  const validBugTypes = new Set(['live', 'onpremise', 'hors_version', 'uncategorized']);
  const bugTypes  = typeof req.query.bug_type  === 'string' && req.query.bug_type
    ? req.query.bug_type.split(',').filter(v => validBugTypes.has(v)) : [];

  const idContains      = typeof req.query.id       === 'string' ? req.query.id.trim()       : null;
  const titleContains   = typeof req.query.title    === 'string' ? req.query.title.trim()    : null;
  const versionContains = typeof req.query.version  === 'string' ? req.query.version.trim()  : null;
  const foundInContains = typeof req.query.found_in === 'string' ? req.query.found_in.trim() : null;
  const buildContains   = typeof req.query.build    === 'string' ? req.query.build.trim()    : null;

  const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : 'changed_date';
  const sortCol = VIOLATION_SORTABLE[sortRaw] ?? 'b.changed_date';
  const dir     = req.query.dir === 'asc' ? 'ASC' : 'DESC';

  const conditions: string[] = [
    'v.resolved_at IS NULL',
    'NOT EXISTS (SELECT 1 FROM conformity_waivers w WHERE w.bug_id = v.bug_id AND w.rule_id = v.rule_id)',
  ];
  const params: unknown[] = [];

  if (teams.length === 1)    { conditions.push('b.team = ?');                                      params.push(teams[0]); }
  else if (teams.length > 1) { conditions.push(`b.team IN (${teams.map(() => '?').join(',')})`);   params.push(...teams); }
  if (zones.length > 0) {
    const zoneParts: string[] = [];
    for (const zone of zones) {
      for (const candidate of zoneCandidates(zone)) {
        zoneParts.push('(b.area_path = ? OR b.area_path LIKE ? OR b.area_path LIKE ?)');
        params.push(candidate, `%\\${candidate}`, `%\\${candidate}\\%`);
      }
    }
    if (zoneParts.length > 0) conditions.push(`(${zoneParts.join(' OR ')})`);
  }
  if (states.length === 1)    { conditions.push('b.state = ?');                                     params.push(states[0]); }
  else if (states.length > 1) { conditions.push(`b.state IN (${states.map(() => '?').join(',')})`); params.push(...states); }
  if (sprints.length === 1)    { conditions.push('b.sprint = ?');                                    params.push(sprints[0]); }
  else if (sprints.length > 1) { conditions.push(`b.sprint IN (${sprints.map(() => '?').join(',')})`); params.push(...sprints); }
  if (bugTypes.length === 1)    { conditions.push('classify_bug(b.version_souhaitee, b.found_in, b.integration_build, b.raison_origine, b.title) = ?');                                              params.push(bugTypes[0]); }
  else if (bugTypes.length > 1) { conditions.push(`classify_bug(b.version_souhaitee, b.found_in, b.integration_build, b.raison_origine, b.title) IN (${bugTypes.map(() => '?').join(',')})`);        params.push(...bugTypes); }
  if (idContains)      { conditions.push("CAST(b.id AS TEXT) LIKE ?");  params.push(`%${idContains}%`); }
  if (titleContains)   { conditions.push('b.title LIKE ?');             params.push(`%${titleContains}%`); }
  if (versionContains) { conditions.push('b.version_souhaitee LIKE ?'); params.push(`%${versionContains}%`); }
  if (foundInContains) { conditions.push('b.found_in LIKE ?');          params.push(`%${foundInContains}%`); }
  if (buildContains)   { conditions.push('b.integration_build LIKE ?'); params.push(`%${buildContains}%`); }
  if (codes.length === 1)    { conditions.push('r.code = ?');                                      params.push(codes[0]); }
  else if (codes.length > 1) { conditions.push(`r.code IN (${codes.map(() => '?').join(',')})`);   params.push(...codes); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const rows = db.prepare(`
    SELECT
      b.id               AS bug_id,
      b.title            AS bug_title,
      b.state            AS bug_state,
      b.team             AS bug_team,
      b.priority         AS bug_priority,
      b.version_souhaitee AS bug_version_souhaitee,
      b.integration_build AS bug_integration_build,
      b.found_in         AS bug_found_in,
      b.resolved_reason  AS bug_resolved_reason,
      b.changed_date     AS bug_changed_date,
      (
        SELECT GROUP_CONCAT(sub.code, ', ')
        FROM (
          SELECT DISTINCT r2.code
          FROM conformity_violations v2
          JOIN conformity_rules r2 ON r2.id = v2.rule_id
          WHERE v2.bug_id = b.id
            AND v2.resolved_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM conformity_waivers cw WHERE cw.bug_id = v2.bug_id AND cw.rule_id = v2.rule_id)
          ORDER BY r2.code
        ) sub
      ) AS rule_codes
    FROM conformity_violations v
    JOIN bugs_cache b ON b.id = v.bug_id
    JOIN conformity_rules r ON r.id = v.rule_id
    ${where}
    GROUP BY b.id
    ORDER BY ${sortCol} ${dir}
  `).all(...params) as {
    bug_id: number; bug_title: string | null; bug_state: string | null;
    bug_team: string | null; bug_priority: number | null;
    bug_version_souhaitee: string | null; bug_integration_build: string | null;
    bug_found_in: string | null; bug_resolved_reason: string | null;
    bug_changed_date: string | null; rule_codes: string | null;
  }[];

  // ─── Excel ───────────────────────────────────────────────────────────────────

  const wb = new ExcelJS.Workbook();
  wb.creator = 'QualiPilot';
  wb.created = new Date();

  const ws = wb.addWorksheet('Anomalies', { views: [{ state: 'frozen', ySplit: 1 }] });

  // Pré-calcul de toutes les lignes
  const tableData = rows.map(row => {
    const ruleCodes = (row.rule_codes ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const rulesLabel = ruleCodes.map(c => `${c} — ${getRuleExplanation(c, row)}`).join('\n');
    const modifiedDate = row.bug_changed_date
      ? new Date(row.bug_changed_date).toLocaleDateString('fr-FR')
      : '';
    return {
      ruleCodes,
      cells: [
        row.bug_id,
        row.bug_title ?? '',
        row.bug_state ?? '',
        row.bug_team ?? '',
        row.bug_priority ?? '',
        row.bug_found_in ?? '',
        row.bug_resolved_reason ?? '',
        row.bug_integration_build ?? '',
        row.bug_version_souhaitee ?? '',
        rulesLabel,
        modifiedDate,
      ] as (string | number)[],
    };
  });

  // Tableau Excel natif (tri/filtre sur chaque colonne)
  ws.addTable({
    name: 'Anomalies',
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      { name: 'ID',                filterButton: true },
      { name: 'Titre',             filterButton: true },
      { name: 'État',              filterButton: true },
      { name: 'Équipe',            filterButton: true },
      { name: 'Priorité',         filterButton: true },
      { name: 'Trouvé dans',       filterButton: true },
      { name: 'Raison clôture',    filterButton: true },
      { name: 'Build',             filterButton: true },
      { name: 'Version souhaitée', filterButton: true },
      { name: 'Règles violées',    filterButton: true },
      { name: 'Modifié le',        filterButton: true },
    ],
    rows: tableData.map(r => r.cells),
  });

  // Largeurs de colonnes
  [10, 55, 12, 18, 10, 18, 20, 22, 24, 70, 18].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.getRow(1).height = 22;

  const RED_FILL: ExcelJS.Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE5E5' } };
  const RED_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFDC2626' }, bold: true };

  // Formatage cellule par cellule (après création du tableau)
  tableData.forEach(({ ruleCodes }, i) => {
    const row = rows[i];
    const rowNum = i + 2; // ligne 1 = en-tête

    const badFields = new Set<string>();
    for (const code of ruleCodes) {
      for (const field of (RULE_TO_FIELDS[code] ?? [])) badFields.add(field);
    }

    // Lien ADO sur l'ID (col 1)
    const idCell = ws.getCell(rowNum, 1);
    idCell.value = { text: `#${row.bug_id}`, hyperlink: `${ADO_EDIT_BASE}${row.bug_id}` };
    idCell.font  = { color: { argb: 'FF1E40AF' }, underline: true };

    // Rouge sur les champs en anomalie
    if (badFields.has('priority'))          { const c = ws.getCell(rowNum, 5); c.fill = RED_FILL; c.font = RED_FONT; }
    if (badFields.has('integration_build')) { const c = ws.getCell(rowNum, 8); c.fill = RED_FILL; c.font = RED_FONT; }
    if (badFields.has('version_souhaitee')) { const c = ws.getCell(rowNum, 9); c.fill = RED_FILL; c.font = RED_FONT; }

    // Cellule règles : retour à la ligne, alignement haut
    const rulesCell = ws.getCell(rowNum, 10);
    rulesCell.alignment = { wrapText: true, vertical: 'top' };
    if (ruleCodes.length > 1) ws.getRow(rowNum).height = ruleCodes.length * 16;
  });

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="anomalies_${date}.xlsx"`);
  wb.xlsx.write(res).then(() => res.end());
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
