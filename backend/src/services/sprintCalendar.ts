import type Database from 'better-sqlite3';
import type { PiWindow } from '../config/sprints';

type SprintSeedEntry = {
  piLabel: string;
  sprintLabel: string;
  startDate: string;
  endDate: string;
};

// Source: planning fourni depuis Azure DevOps (24-25 et 25-26).
// On conserve exactement ces dates dans le seed initial.
const DEFAULT_SPRINT_CALENDAR: SprintSeedEntry[] = [
  { piLabel: '24-25 PI1', sprintLabel: 'SP1', startDate: '2024-07-22', endDate: '2024-08-02' },
  { piLabel: '24-25 PI1', sprintLabel: 'SP2', startDate: '2024-08-05', endDate: '2024-08-16' },
  { piLabel: '24-25 PI1', sprintLabel: 'SP3', startDate: '2024-08-19', endDate: '2024-08-30' },
  { piLabel: '24-25 PI1', sprintLabel: 'SP4', startDate: '2024-09-02', endDate: '2024-09-13' },
  { piLabel: '24-25 PI1', sprintLabel: 'SP5', startDate: '2024-09-16', endDate: '2024-09-20' },
  { piLabel: '24-25 PI2', sprintLabel: 'SP1', startDate: '2024-09-23', endDate: '2024-10-04' },
  { piLabel: '24-25 PI2', sprintLabel: 'SP2', startDate: '2024-10-07', endDate: '2024-10-18' },
  { piLabel: '24-25 PI2', sprintLabel: 'SP3', startDate: '2024-10-21', endDate: '2024-11-01' },
  { piLabel: '24-25 PI2', sprintLabel: 'SP4', startDate: '2024-11-04', endDate: '2024-11-15' },
  { piLabel: '24-25 PI2', sprintLabel: 'SP5', startDate: '2024-11-18', endDate: '2024-11-22' },
  { piLabel: '24-25 PI3', sprintLabel: 'SP1', startDate: '2024-11-25', endDate: '2024-12-06' },
  { piLabel: '24-25 PI3', sprintLabel: 'SP2', startDate: '2024-12-09', endDate: '2024-12-20' },
  { piLabel: '24-25 PI3', sprintLabel: 'SP3', startDate: '2024-12-23', endDate: '2025-01-03' },
  { piLabel: '24-25 PI3', sprintLabel: 'SP4', startDate: '2025-01-06', endDate: '2025-01-17' },
  { piLabel: '24-25 PI3', sprintLabel: 'SP5', startDate: '2025-01-20', endDate: '2025-01-24' },
  { piLabel: '24-25 PI4', sprintLabel: 'SP1', startDate: '2025-01-27', endDate: '2025-02-07' },
  { piLabel: '24-25 PI4', sprintLabel: 'SP2', startDate: '2025-02-10', endDate: '2025-02-21' },
  { piLabel: '24-25 PI4', sprintLabel: 'SP3', startDate: '2025-02-24', endDate: '2025-03-07' },
  { piLabel: '24-25 PI4', sprintLabel: 'SP4', startDate: '2025-03-10', endDate: '2025-03-21' },
  { piLabel: '24-25 PI4', sprintLabel: 'SP5', startDate: '2025-03-24', endDate: '2025-03-28' },
  { piLabel: '24-25 PI5', sprintLabel: 'SP1', startDate: '2025-03-31', endDate: '2025-04-11' },
  { piLabel: '24-25 PI5', sprintLabel: 'SP2', startDate: '2025-04-14', endDate: '2025-04-25' },
  { piLabel: '24-25 PI5', sprintLabel: 'SP3', startDate: '2025-04-28', endDate: '2025-05-09' },
  { piLabel: '24-25 PI5', sprintLabel: 'SP4', startDate: '2025-05-12', endDate: '2025-05-23' },
  { piLabel: '24-25 PI6', sprintLabel: 'SP1', startDate: '2025-05-26', endDate: '2025-06-06' },
  { piLabel: '24-25 PI6', sprintLabel: 'SP2', startDate: '2025-06-09', endDate: '2025-06-20' },
  { piLabel: '24-25 PI6', sprintLabel: 'SP3', startDate: '2025-06-23', endDate: '2025-07-04' },
  { piLabel: '24-25 PI6', sprintLabel: 'SP4', startDate: '2025-07-07', endDate: '2025-07-18' },
  { piLabel: '24-25 PI6', sprintLabel: 'SP5', startDate: '2025-07-21', endDate: '2025-08-01' },
  { piLabel: '25-26 PI1', sprintLabel: 'SP1', startDate: '2025-08-04', endDate: '2025-08-15' },
  { piLabel: '25-26 PI1', sprintLabel: 'SP2', startDate: '2025-08-18', endDate: '2025-08-29' },
  { piLabel: '25-26 PI1', sprintLabel: 'SP3', startDate: '2025-09-01', endDate: '2025-09-12' },
  { piLabel: '25-26 PI1', sprintLabel: 'SP4', startDate: '2025-09-15', endDate: '2025-09-26' },
  { piLabel: '25-26 PI1', sprintLabel: 'SP5', startDate: '2025-10-13', endDate: '2025-10-17' },
  { piLabel: '25-26 PI2', sprintLabel: 'SP1', startDate: '2025-09-29', endDate: '2025-10-10' },
  { piLabel: '25-26 PI2', sprintLabel: 'SP2', startDate: '2025-10-20', endDate: '2025-10-31' },
  { piLabel: '25-26 PI2', sprintLabel: 'SP3', startDate: '2025-11-03', endDate: '2025-11-14' },
  { piLabel: '25-26 PI2', sprintLabel: 'SP4', startDate: '2025-11-17', endDate: '2025-11-28' },
  { piLabel: '25-26 PI2', sprintLabel: 'SP5', startDate: '2025-12-01', endDate: '2025-12-05' },
  { piLabel: '25-26 PI3', sprintLabel: 'SP1', startDate: '2025-12-08', endDate: '2025-12-19' },
  { piLabel: '25-26 PI3', sprintLabel: 'SP2', startDate: '2025-12-22', endDate: '2026-01-02' },
  { piLabel: '25-26 PI3', sprintLabel: 'SP3', startDate: '2026-01-05', endDate: '2026-01-16' },
  { piLabel: '25-26 PI3', sprintLabel: 'SP4', startDate: '2026-01-19', endDate: '2026-01-30' },
  { piLabel: '25-26 PI3', sprintLabel: 'SP5', startDate: '2026-02-02', endDate: '2026-02-06' },
  { piLabel: '25-26 PI4', sprintLabel: 'SP1', startDate: '2026-02-03', endDate: '2026-02-20' },
  { piLabel: '25-26 PI4', sprintLabel: 'SP2', startDate: '2026-02-23', endDate: '2026-03-06' },
  { piLabel: '25-26 PI4', sprintLabel: 'SP3', startDate: '2026-03-09', endDate: '2026-03-20' },
  { piLabel: '25-26 PI4', sprintLabel: 'SP4', startDate: '2026-03-23', endDate: '2026-04-03' },
  { piLabel: '25-26 PI4', sprintLabel: 'SP5', startDate: '2026-04-06', endDate: '2026-04-10' },
  { piLabel: '25-26 PI5', sprintLabel: 'SP1', startDate: '2026-04-13', endDate: '2026-04-24' },
  { piLabel: '25-26 PI5', sprintLabel: 'SP2', startDate: '2026-04-27', endDate: '2026-05-08' },
  { piLabel: '25-26 PI5', sprintLabel: 'SP3', startDate: '2026-05-11', endDate: '2026-05-22' },
  { piLabel: '25-26 PI5', sprintLabel: 'SP4', startDate: '2026-05-25', endDate: '2026-06-05' },
  { piLabel: '25-26 PI5', sprintLabel: 'SP5', startDate: '2026-06-08', endDate: '2026-06-12' },
  { piLabel: '25-26 PI6', sprintLabel: 'SP1', startDate: '2026-06-15', endDate: '2026-06-26' },
  { piLabel: '25-26 PI6', sprintLabel: 'SP2', startDate: '2026-06-29', endDate: '2026-07-10' },
  { piLabel: '25-26 PI6', sprintLabel: 'SP3', startDate: '2026-07-13', endDate: '2026-07-24' },
  { piLabel: '25-26 PI6', sprintLabel: 'SP4', startDate: '2026-07-27', endDate: '2026-08-07' },
  { piLabel: '25-26 PI6', sprintLabel: 'SP5', startDate: '2026-08-10', endDate: '2026-08-14' },
];

export interface SprintCalendarEntry {
  id: number;
  piLabel: string;
  sprintLabel: string;
  startDate: string;
  endDate: string;
  active: boolean;
  sortOrder: number;
}

export interface SprintCalendarSettingsResponse {
  entries: SprintCalendarEntry[];
  piWindows: PiWindow[];
  updatedAt: string;
}

export interface SprintCalendarUpdateEntry {
  id: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function defaultSeedRows(): Array<SprintSeedEntry & { sortOrder: number }> {
  return DEFAULT_SPRINT_CALENDAR.map((row, idx) => ({
    ...row,
    sortOrder: idx + 1,
  }));
}

function insertSeedRows(db: Database.Database, rows: Array<SprintSeedEntry & { sortOrder: number }>): void {
  const insert = db.prepare(`
    INSERT INTO sprint_calendar (
      pi_label,
      sprint_label,
      start_date,
      end_date,
      active,
      sort_order,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
  `);

  db.transaction(() => {
    for (const row of rows) {
      insert.run(row.piLabel, row.sprintLabel, row.startDate, row.endDate, row.sortOrder);
    }
  })();
}

function mapRows(db: Database.Database): SprintCalendarEntry[] {
  const rows = db.prepare(`
    SELECT
      id,
      pi_label,
      sprint_label,
      start_date,
      end_date,
      active,
      sort_order
    FROM sprint_calendar
    ORDER BY start_date ASC, sort_order ASC, id ASC
  `).all() as Array<{
    id: number;
    pi_label: string;
    sprint_label: string;
    start_date: string;
    end_date: string;
    active: number;
    sort_order: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    piLabel: row.pi_label,
    sprintLabel: row.sprint_label,
    startDate: row.start_date,
    endDate: row.end_date,
    active: row.active === 1,
    sortOrder: row.sort_order,
  }));
}

function isLegacyGeneratedSeed(entries: SprintCalendarEntry[]): boolean {
  if (entries.length !== 45) return false;

  const expectedPiLabels = new Set([
    '24-25 PI4',
    '24-25 PI5',
    '24-25 PI6',
    '25-26 PI1',
    '25-26 PI2',
    '25-26 PI3',
    '25-26 PI4',
    '25-26 PI5',
    '25-26 PI6',
  ]);
  const labels = new Set(entries.map((e) => e.piLabel));
  if (labels.size !== expectedPiLabels.size) return false;
  for (const label of expectedPiLabels) {
    if (!labels.has(label)) return false;
  }

  const keys = new Set(entries.map((e) => `${e.piLabel}|${e.sprintLabel}`));
  const sprints = ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'];
  for (const label of expectedPiLabels) {
    for (const sprint of sprints) {
      if (!keys.has(`${label}|${sprint}`)) return false;
    }
  }
  return true;
}

function aggregatePiWindows(entries: SprintCalendarEntry[]): PiWindow[] {
  const byPi = new Map<string, { start: string; end: string; order: number }>();
  for (const entry of entries) {
    const prev = byPi.get(entry.piLabel);
    if (!prev) {
      byPi.set(entry.piLabel, { start: entry.startDate, end: entry.endDate, order: entry.sortOrder });
      continue;
    }
    byPi.set(entry.piLabel, {
      start: entry.startDate < prev.start ? entry.startDate : prev.start,
      end: entry.endDate > prev.end ? entry.endDate : prev.end,
      order: Math.min(prev.order, entry.sortOrder),
    });
  }

  return [...byPi.entries()]
    .sort((a, b) => {
      if (a[1].start !== b[1].start) return a[1].start.localeCompare(b[1].start);
      return a[1].order - b[1].order;
    })
    .map(([label, payload]) => ({
      key: label.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      label,
      start: payload.start,
      end: payload.end,
    }));
}

function defaultPiWindows(): PiWindow[] {
  const seedEntries: SprintCalendarEntry[] = defaultSeedRows().map((row, idx) => ({
    id: idx + 1,
    piLabel: row.piLabel,
    sprintLabel: row.sprintLabel,
    startDate: row.startDate,
    endDate: row.endDate,
    active: true,
    sortOrder: row.sortOrder,
  }));
  return aggregatePiWindows(seedEntries);
}

function ensureSprintCalendarSeed(db: Database.Database): void {
  const count = (db.prepare(`SELECT COUNT(*) AS n FROM sprint_calendar`).get() as { n: number }).n;
  const defaults = defaultSeedRows();

  if (count === 0) {
    insertSeedRows(db, defaults);
    return;
  }

  const entries = mapRows(db);
  if (!isLegacyGeneratedSeed(entries)) return;

  db.prepare(`DELETE FROM sprint_calendar`).run();
  insertSeedRows(db, defaults);
}

function buildPiWindows(entries: SprintCalendarEntry[]): PiWindow[] {
  const active = entries.filter((e) => e.active);
  if (active.length === 0) return defaultPiWindows();
  return aggregatePiWindows(active);
}

export function getConfiguredPiWindows(db: Database.Database): PiWindow[] {
  ensureSprintCalendarSeed(db);
  const entries = mapRows(db);
  return buildPiWindows(entries);
}

export function getSprintCalendarSettings(db: Database.Database): SprintCalendarSettingsResponse {
  ensureSprintCalendarSeed(db);
  const entries = mapRows(db);
  return {
    entries,
    piWindows: buildPiWindows(entries),
    updatedAt: new Date().toISOString(),
  };
}

export function updateSprintCalendarSettings(
  db: Database.Database,
  updates: SprintCalendarUpdateEntry[],
): SprintCalendarSettingsResponse {
  ensureSprintCalendarSeed(db);

  const cleaned = updates.map((row) => ({
    id: Number(row.id),
    startDate: String(row.startDate ?? '').trim(),
    endDate: String(row.endDate ?? '').trim(),
    active: Boolean(row.active),
  }));

  if (cleaned.length === 0) {
    throw new Error('Aucune ligne à mettre à jour');
  }
  for (const row of cleaned) {
    if (!Number.isFinite(row.id) || row.id <= 0) throw new Error('Identifiant de ligne invalide');
    if (!isIsoDate(row.startDate) || !isIsoDate(row.endDate)) throw new Error('Les dates doivent être au format YYYY-MM-DD');
    if (row.startDate > row.endDate) throw new Error('La date de fin doit être supérieure ou égale à la date de début');
  }

  const existingIds = new Set((db.prepare(`SELECT id FROM sprint_calendar`).all() as { id: number }[]).map((r) => r.id));
  for (const row of cleaned) {
    if (!existingIds.has(row.id)) throw new Error(`Ligne introuvable: ${row.id}`);
  }

  const stmt = db.prepare(`
    UPDATE sprint_calendar
    SET start_date = ?,
        end_date = ?,
        active = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `);

  db.transaction(() => {
    for (const row of cleaned) {
      stmt.run(row.startDate, row.endDate, row.active ? 1 : 0, row.id);
    }
  })();

  return getSprintCalendarSettings(db);
}