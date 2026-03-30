import type Database from 'better-sqlite3';

export interface ReleaseVersionSetting {
  version: string;
  selected: boolean;
}

export interface ReleaseVersionSettingsResult {
  versions: ReleaseVersionSetting[];
  alwaysVisible: string[];
}

const ALWAYS_VISIBLE_VERSIONS = ['vide', 'Non concerne'] as const;

function normalizeVersion(rawVersion: string | null): string {
  if (!rawVersion || !rawVersion.trim()) return 'vide';
  const trimmed = rawVersion.trim();
  const token = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (token === 'nonconcerne') return 'Non concerne';
  return trimmed;
}

function splitMajorAndPatch(normalizedVersion: string): { majorVersion: string; patch: string | null } {
  if (normalizedVersion === 'vide' || normalizedVersion === 'Non concerne') {
    return { majorVersion: normalizedVersion, patch: null };
  }

  const lower = normalizedVersion.toLowerCase();
  const patchIndex = lower.indexOf('patch');
  if (patchIndex <= 0) {
    return { majorVersion: normalizedVersion, patch: null };
  }

  const majorVersion = normalizedVersion.slice(0, patchIndex).trim().replace(/[-_]+$/, '').trim();
  const patchTail = normalizedVersion.slice(patchIndex).trim();
  if (!majorVersion || !patchTail) {
    return { majorVersion: normalizedVersion, patch: null };
  }
  return { majorVersion, patch: `${majorVersion} ${patchTail}` };
}

function discoverMajorVersions(db: Database.Database): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT version_souhaitee
    FROM bugs_cache
  `).all() as { version_souhaitee: string | null }[];

  const majors = new Set<string>();
  for (const row of rows) {
    const normalized = normalizeVersion(row.version_souhaitee);
    const { majorVersion } = splitMajorAndPatch(normalized);
    if (majorVersion === 'vide' || majorVersion === 'Non concerne') continue;
    majors.add(majorVersion);
  }

  return [...majors].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
}

export function syncReleaseVersionSettings(db: Database.Database): void {
  const majors = discoverMajorVersions(db);
  if (majors.length === 0) return;

  const insert = db.prepare(`
    INSERT INTO kpi_release_version_filters (major_version, selected, discovered_at, updated_at)
    VALUES (?, 1, datetime('now'), datetime('now'))
    ON CONFLICT(major_version) DO NOTHING
  `);

  db.transaction(() => {
    for (const major of majors) insert.run(major);
  })();
}

function readSettings(db: Database.Database): ReleaseVersionSetting[] {
  const rows = db.prepare(`
    SELECT major_version, selected
    FROM kpi_release_version_filters
    ORDER BY major_version COLLATE NOCASE
  `).all() as { major_version: string; selected: number }[];

  return rows.map((row) => ({
    version: row.major_version,
    selected: row.selected === 1,
  }));
}

export function getReleaseVersionSettings(db: Database.Database): ReleaseVersionSettingsResult {
  syncReleaseVersionSettings(db);
  return {
    versions: readSettings(db),
    alwaysVisible: [...ALWAYS_VISIBLE_VERSIONS],
  };
}

export function updateReleaseVersionSettings(
  db: Database.Database,
  selectedVersions: string[],
): ReleaseVersionSettingsResult {
  syncReleaseVersionSettings(db);

  const selected = [...new Set(selectedVersions.map((v) => v.trim()).filter(Boolean))]
    .filter((v) => !ALWAYS_VISIBLE_VERSIONS.includes(v as (typeof ALWAYS_VISIBLE_VERSIONS)[number]));

  db.transaction(() => {
    db.prepare(`
      UPDATE kpi_release_version_filters
      SET selected = 0, updated_at = datetime('now')
    `).run();

    if (selected.length > 0) {
      const placeholders = selected.map(() => '?').join(', ');
      db.prepare(`
        UPDATE kpi_release_version_filters
        SET selected = 1, updated_at = datetime('now')
        WHERE major_version IN (${placeholders})
      `).run(...selected);
    }
  })();

  return getReleaseVersionSettings(db);
}

