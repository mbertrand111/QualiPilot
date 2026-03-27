import { getDb } from '../db';
import { fetchAllBugs, CUSTOM_FIELD_REFS, type AdoBug } from './azureDevOps';
import logger from '../logger';

// ─── Field extractors ─────────────────────────────────────────────────────────

function getString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  return null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return isNaN(n) ? null : n;
  }
  return null;
}

function getAssignedTo(value: unknown): string | null {
  if (typeof value === 'object' && value !== null && 'displayName' in value) {
    return getString((value as Record<string, unknown>)['displayName']);
  }
  return getString(value);
}

// Normalisation des noms d'équipes : ADO utilise parfois des underscores ou variantes
// alors que l'application affiche des noms canoniques avec espaces/ponctuation.
const TEAM_NAME_NORMALIZE: Record<string, string> = {
  'GO_FAHST':      'GO FAHST',
  'MELI_MELO':     'MELI MELO',
  'MAGIC_SYSTEM':  'MAGIC SYSTEM',
  'JURASSIC_BACK': 'JURASSIC BACK',
  'NULL_REF':      'NULL.REF',
  'NULL REF':      'NULL.REF',
};

function normalizeTeamName(raw: string): string {
  return TEAM_NAME_NORMALIZE[raw] ?? raw;
}

// Extrait le nom d'équipe depuis l'area path
// Ex: "Isagri_Dev_GC_GestionCommerciale\COCO" → "COCO"
// Ex: "Isagri_Dev_GC_GestionCommerciale\GO_FAHST" → "GO FAHST"
// Ex: "Isagri_Dev_GC_GestionCommerciale\Bugs à corriger\Versions LIVE" → "Bugs à corriger LIVE"
// Ex: "Isagri_Dev_GC_GestionCommerciale\Bugs à corriger\Versions historiques" → "Bugs à corriger OnPremise"
// Ex: "Isagri_Dev_GC_GestionCommerciale\Bugs à corriger\Hors versions" → "Bugs à corriger Hors versions"
// Ex: "Isagri_Dev_GC_GestionCommerciale\Bugs à corriger" → "Bugs à corriger"
function extractTeamFromAreaPath(areaPath: string | null): string | null {
  if (!areaPath) return null;
  const parts = areaPath.split('\\');
  if (parts.length < 2) return null;

  const level1 = parts[1];

  if (level1 === 'Bugs à corriger' && parts.length >= 3) {
    const sub = parts[2];
    if (sub === 'Versions LIVE')        return 'Bugs à corriger LIVE';
    if (sub === 'Versions historiques') return 'Bugs à corriger OnPremise';
    return `Bugs à corriger ${sub}`;
  }

  return normalizeTeamName(level1);
}

// Extrait le sprint depuis l'iteration path, préfixé par l'exercice ou "Archive"
// Ex: "Isagri_Dev_GC_GestionCommerciale\2025-2026\PI2\PI2-SP4" → "2025-2026 · PI2-SP4"
//     "Isagri_Dev_GC_GestionCommerciale\Z_Archives\2024-2025\PI5\PI5-SP2" → "Archive · PI5-SP2"
function extractSprintFromIterationPath(iterationPath: string | null): string | null {
  if (!iterationPath) return null;
  const sprintMatch = iterationPath.match(/PI\d+(?:-SP\d+)?$/);
  if (!sprintMatch) return null;
  const sprint = sprintMatch[0];

  if (/archive/i.test(iterationPath)) return `Archive · ${sprint}`;

  const exerciseMatch = iterationPath.match(/(\d{4}-\d{4})/);
  return exerciseMatch ? `${exerciseMatch[1]} · ${sprint}` : sprint;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapBug(item: AdoBug) {
  const f = item.fields;
  const areaPath      = getString(f['System.AreaPath']);
  const iterationPath = getString(f['System.IterationPath']);
  return {
    id:                item.id,
    title:             getString(f['System.Title']),
    state:             getString(f['System.State']),
    priority:          getNumber(f['Microsoft.VSTS.Common.Priority']),
    area_path:         areaPath,
    iteration_path:    iterationPath,
    sprint:            extractSprintFromIterationPath(iterationPath),
    assigned_to:       getAssignedTo(f['System.AssignedTo']),
    created_by:        getAssignedTo(f['System.CreatedBy']),
    closed_date:       getString(f['Microsoft.VSTS.Common.ClosedDate']),
    team:              extractTeamFromAreaPath(areaPath),
    filiere:           null,
    created_date:      getString(f['System.CreatedDate']),
    resolved_date:     getString(f['Microsoft.VSTS.Common.ResolvedDate']),
    changed_date:      getString(f['System.ChangedDate']),
    found_in:          getString(f['Microsoft.VSTS.Build.FoundIn']),
    integration_build: getString(f['Microsoft.VSTS.Build.IntegrationBuild']),
    version_souhaitee: getString(f[CUSTOM_FIELD_REFS.versionSouhaitee]),
    resolved_reason:   getString(f[CUSTOM_FIELD_REFS.resolvedReason]),
    raison_origine:    getString(f[CUSTOM_FIELD_REFS.raisonOrigine]),
    sprint_done:       getString(f[CUSTOM_FIELD_REFS.sprintDone]),
    raw_json:          JSON.stringify(f),
    last_synced_at:    new Date().toISOString(),
  };
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function runSync(): Promise<{ synced: number; lastSyncAt: string }> {
  const bugs = await fetchAllBugs();
  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO bugs_cache (
      id, title, state, priority, area_path, iteration_path, sprint, assigned_to, created_by,
      team, filiere, created_date, resolved_date, closed_date, changed_date,
      found_in, integration_build, version_souhaitee, resolved_reason, raison_origine, sprint_done,
      raw_json, last_synced_at
    ) VALUES (
      @id, @title, @state, @priority, @area_path, @iteration_path, @sprint, @assigned_to, @created_by,
      @team, @filiere, @created_date, @resolved_date, @closed_date, @changed_date,
      @found_in, @integration_build, @version_souhaitee, @resolved_reason, @raison_origine, @sprint_done,
      @raw_json, @last_synced_at
    )
    ON CONFLICT(id) DO UPDATE SET
      title             = excluded.title,
      state             = excluded.state,
      priority          = excluded.priority,
      area_path         = excluded.area_path,
      iteration_path    = excluded.iteration_path,
      sprint            = excluded.sprint,
      assigned_to       = excluded.assigned_to,
      created_by        = excluded.created_by,
      closed_date       = excluded.closed_date,
      team              = excluded.team,
      filiere           = excluded.filiere,
      created_date      = excluded.created_date,
      resolved_date     = excluded.resolved_date,
      changed_date      = excluded.changed_date,
      found_in          = excluded.found_in,
      integration_build = excluded.integration_build,
      version_souhaitee = excluded.version_souhaitee,
      resolved_reason   = excluded.resolved_reason,
      raison_origine    = excluded.raison_origine,
      sprint_done       = excluded.sprint_done,
      raw_json          = excluded.raw_json,
      last_synced_at    = excluded.last_synced_at
  `);

  // Marqueur de début de sync : on supprimera les bugs dont last_synced_at < syncStart
  const syncStart = new Date().toISOString();

  const syncAll = db.transaction((items: ReturnType<typeof mapBug>[]) => {
    for (const item of items) upsert.run(item);
    // Supprimer d'abord les violations liées aux bugs absents (contrainte FK)
    db.prepare(`
      DELETE FROM conformity_violations
      WHERE bug_id IN (SELECT id FROM bugs_cache WHERE last_synced_at < ?)
    `).run(syncStart);
    // Puis supprimer les bugs absents de ce cycle
    db.prepare(`DELETE FROM bugs_cache WHERE last_synced_at < ?`).run(syncStart);
  });

  syncAll(bugs.map(mapBug));

  const lastSyncAt = new Date().toISOString();
  logger.info({ synced: bugs.length, lastSyncAt }, 'Sync completed');

  return { synced: bugs.length, lastSyncAt };
}
