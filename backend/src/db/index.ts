import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config';
import logger from '../logger';
import { classifyBug } from '../services/bugClassifier';

let _db: Database.Database | null = null;

// ─── Rule migration ───────────────────────────────────────────────────────────
// Supprime les anciennes règles et s'assure que les nouvelles sont présentes
// avec les bonnes descriptions/severity. Idempotent.

const OBSOLETE_RULE_CODES = [
  'VERSION_SOUHAITEE_CHECK',
  'INTEGRATION_BUILD_REQUIRED',
  'NON_CONCERNE_COHERENCE',
  'CLOSED_BUG_IN_TRIAGE_AREA',
  'AREA_PATH_PRODUCT_COHERENCE',
  'NON_CLOSED_TRANSVERSE_AREA',
];

const CURRENT_RULES: { code: string; description: string; severity: string }[] = [
  { code: 'PRIORITY_CHECK',               description: 'Priority doit être 2',                                                     severity: 'error' },
  { code: 'INTEGRATION_BUILD_NOT_EMPTIED', description: 'Bugs New/Active doivent avoir Integration Build vide',                     severity: 'error' },
  { code: 'TRIAGE_AREA_CHECK',            description: 'Cohérence zone triage : bugs fermés, sous-classement et produit correct',  severity: 'error' },
  { code: 'BUGS_TRANSVERSE_AREA',         description: 'Bug non Closed dans zone transverse (Etats/GC/Hors-production/Maintenances/Performance/Securite/Tests auto)', severity: 'error' },
  { code: 'FAH_VERSION_REQUIRED',         description: 'Bugs LIVE (found_in ≥ 14.xx) doivent avoir version souhaitée avec FAH_',  severity: 'error' },
  { code: 'CLOSED_BUG_COHERENCE',         description: 'Bug non-corrigé (Closed) → version & build doivent être "-"',             severity: 'error' },
  { code: 'VERSION_CHECK',               description: 'Format version souhaitée valide selon le type de bug (FAH_ / 12. / 13.8)', severity: 'error' },
  { code: 'BUILD_CHECK',                 description: 'Bugs Closed/Resolved doivent avoir un build valide dans la liste connue',  severity: 'error' },
  { code: 'VERSION_BUILD_COHERENCE',     description: 'Cohérence version/build : found_in OnPremise+version Live, format Patch', severity: 'error' },
];

// Re-dérive les valeurs sprint depuis iteration_path pour les bugs déjà en cache
// Idempotent : ne met à jour que les sprints qui ne contiennent pas encore " · "
function deriveSprintLabel(iterationPath: string): string | null {
  const sprintMatch = iterationPath.match(/PI\d+(?:-SP\d+)?$/);
  if (!sprintMatch) return null;
  const sprint = sprintMatch[0];
  if (/archive/i.test(iterationPath)) return `Archive · ${sprint}`;
  const exerciseMatch = iterationPath.match(/(\d{4}-\d{4})/);
  return exerciseMatch ? `${exerciseMatch[1]} · ${sprint}` : sprint;
}

// Ajoute la colonne created_by si elle n'existe pas encore (migration non destructive)
function migrateAddCreatedBy(db: Database.Database): void {
  try { db.exec(`ALTER TABLE bugs_cache ADD COLUMN created_by TEXT`); } catch { /* déjà présente */ }
  try { db.exec(`ALTER TABLE bugs_cache ADD COLUMN closed_date TEXT`); } catch { /* déjà présente */ }
}

function migrateSprintValues(db: Database.Database): void {
  const rows = db.prepare(
    `SELECT id, iteration_path FROM bugs_cache WHERE iteration_path IS NOT NULL AND (sprint IS NULL OR sprint NOT LIKE '% · %')`
  ).all() as { id: number; iteration_path: string }[];

  if (rows.length === 0) return;

  const update = db.prepare(`UPDATE bugs_cache SET sprint = ? WHERE id = ?`);
  db.transaction(() => {
    for (const row of rows) {
      update.run(deriveSprintLabel(row.iteration_path), row.id);
    }
  })();
}

// Normalise les noms d'équipes dans bugs_cache (GO_FAHST → GO FAHST, etc.)
// Idempotent : n'affecte que les lignes avec les anciennes valeurs.
function migrateNormalizeTeamNames(db: Database.Database): void {
  const renames: [canonical: string, normalizedToken: string][] = [
    ['GO FAHST',      'GOFAHST'],
    ['MELI MELO',     'MELIMELO'],
    ['MAGIC SYSTEM',  'MAGICSYSTEM'],
    ['JURASSIC BACK', 'JURASSICBACK'],
    ['NULL.REF',      'NULLREF'],
  ];
  const update = db.prepare(`
    UPDATE bugs_cache
    SET team = ?
    WHERE team IS NOT NULL
      AND REPLACE(REPLACE(REPLACE(UPPER(TRIM(team)), '.', ''), '_', ''), ' ', '') = ?
  `);
  db.transaction(() => {
    for (const [canonical, token] of renames) update.run(canonical, token);
  })();
}

function migrateRules(db: Database.Database): void {
  // Supprimer les violations liées aux anciennes règles
  const deleteViolations = db.prepare(
    `DELETE FROM conformity_violations WHERE rule_id IN (SELECT id FROM conformity_rules WHERE code = ?)`
  );
  // Supprimer les anciennes règles
  const deleteRule = db.prepare(`DELETE FROM conformity_rules WHERE code = ?`);

  // Mettre à jour description/severity des règles existantes et insérer les nouvelles
  const upsertRule = db.prepare(`
    INSERT INTO conformity_rules (code, description, severity, active, rule_config)
    VALUES (@code, @description, @severity, 1, '{}')
    ON CONFLICT(code) DO UPDATE SET
      description = excluded.description,
      severity    = excluded.severity
  `);

  db.transaction(() => {
    for (const code of OBSOLETE_RULE_CODES) {
      deleteViolations.run(code);
      deleteRule.run(code);
    }
    for (const rule of CURRENT_RULES) {
      upsertRule.run(rule);
    }
  })();
}

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(config.databasePath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.function('classify_bug', (vs: string | null, fi: string | null): string => classifyBug(vs, fi));

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  _db.exec(schema);

  migrateRules(_db);
  migrateAddCreatedBy(_db);
  migrateSprintValues(_db);
  migrateNormalizeTeamNames(_db);

  logger.info({ databasePath: config.databasePath }, 'Database initialized');
  return _db;
}
