import type Database from 'better-sqlite3';
import { getDb } from '../db';
import { teamBacklogs, type TeamBacklog, type TeamBacklogBug } from './kpis';

const TEAM_ORDER = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];
const LIVE_AREA_TOKEN = 'bugsacorrigerlive';

export type KpiHistoryTrigger = 'sync' | 'scheduler' | 'manual';

export interface KpiHistoryCaptureResult {
  captured: boolean;
  reason: 'captured' | 'updated_existing' | 'not_friday' | 'no_sprint' | 'not_target_sprint';
  sprintName: string | null;
  snapshotDate: string;
  snapshotId: number | null;
  liveAreaBugs: number;
}

export interface TeamBacklogSnapshotRow {
  team: string;
  objective: number;
  gc_bugs: number;
  new_bugs: number;
  active_bugs: number;
  resolved_bugs: number;
  co_bugs: number;
  iw_bugs: number;
}

export interface TeamBacklogSnapshot {
  id: number;
  snapshot_date: string;
  sprint_name: string;
  pi_name: string | null;
  source: string;
  live_area_bugs: number;
  teams: TeamBacklogSnapshotRow[];
}

export interface TeamBacklogHistoryResponse {
  generatedAt: string;
  teamOrder: string[];
  snapshots: TeamBacklogSnapshot[];
}

function ensureKpiHistorySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kpi_team_backlog_snapshots (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_date    TEXT NOT NULL,
      sprint_name      TEXT NOT NULL,
      pi_name          TEXT,
      live_area_bugs   INTEGER NOT NULL DEFAULT 0,
      source           TEXT NOT NULL,
      created_at       TEXT DEFAULT (datetime('now')),
      UNIQUE(sprint_name)
    );

    CREATE TABLE IF NOT EXISTS kpi_team_backlog_snapshot_rows (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id   INTEGER NOT NULL REFERENCES kpi_team_backlog_snapshots(id) ON DELETE CASCADE,
      team          TEXT NOT NULL,
      objective     INTEGER NOT NULL,
      gc_bugs       INTEGER NOT NULL,
      new_bugs      INTEGER NOT NULL,
      active_bugs   INTEGER NOT NULL,
      resolved_bugs INTEGER NOT NULL,
      co_bugs       INTEGER NOT NULL,
      iw_bugs       INTEGER NOT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      UNIQUE(snapshot_id, team)
    );
  `);
}

function normalizeToken(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function parisDateIso(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isFridayInParis(date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  }).format(date);
  return weekday.toLowerCase() === 'fri';
}

function extractSprintToken(sprintName: string | null): string | null {
  if (!sprintName) return null;
  const m = sprintName.match(/PI\d+-SP\d+$/i);
  return m ? m[0].toUpperCase() : null;
}

function extractPiName(sprintName: string | null): string | null {
  if (!sprintName) return null;
  const token = extractSprintToken(sprintName) ?? sprintName;
  const m = token.match(/PI\d+/i);
  return m ? m[0].toUpperCase() : null;
}

function isTargetSprint(sprintName: string | null): boolean {
  const token = extractSprintToken(sprintName);
  return token !== null && /PI\d+-SP[1-4]$/i.test(token);
}

function inferCurrentSprintName(bugs: TeamBacklogBug[]): string | null {
  const counts = new Map<string, number>();
  for (const bug of bugs) {
    const sprint = (bug.sprint ?? '').trim();
    if (!sprint || sprint === '-' || /archive/i.test(sprint)) continue;
    counts.set(sprint, (counts.get(sprint) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))[0]?.[0] ?? null;
}

function countLiveAreaOpenBugs(db: Database.Database): number {
  const rows = db.prepare(`
    SELECT team, title
    FROM bugs_cache
    WHERE state IN ('New', 'Active')
  `).all() as { team: string | null; title: string | null }[];

  let total = 0;
  for (const row of rows) {
    if (normalizeToken(row.team) !== LIVE_AREA_TOKEN) continue;
    const titleUpper = (row.title ?? '').toUpperCase();
    if (titleUpper.includes('[CO]') || titleUpper.includes('[IW]')) continue;
    total += 1;
  }
  return total;
}

function teamToSnapshotRow(team: TeamBacklog): TeamBacklogSnapshotRow {
  return {
    team: team.team,
    objective: team.objective,
    gc_bugs: team.gcBugs,
    new_bugs: team.newBugs,
    active_bugs: team.activeBugs,
    resolved_bugs: team.resolvedBugs,
    co_bugs: team.coBugs,
    iw_bugs: team.iwBugs,
  };
}

export function captureKpiTeamBacklogSnapshotIfDue(trigger: KpiHistoryTrigger): KpiHistoryCaptureResult {
  const db = getDb();
  ensureKpiHistorySchema(db);
  const snapshotDate = parisDateIso();

  const backlog = teamBacklogs(db);
  const sprintName = inferCurrentSprintName(backlog.bugs);
  const liveAreaBugs = countLiveAreaOpenBugs(db);

  if (!sprintName) {
    return { captured: false, reason: 'no_sprint', sprintName: null, snapshotDate, snapshotId: null, liveAreaBugs };
  }

  if (!isTargetSprint(sprintName)) {
    return { captured: false, reason: 'not_target_sprint', sprintName, snapshotDate, snapshotId: null, liveAreaBugs };
  }

  if (!isFridayInParis()) {
    return { captured: false, reason: 'not_friday', sprintName, snapshotDate, snapshotId: null, liveAreaBugs };
  }

  const existing = db.prepare(`SELECT id FROM kpi_team_backlog_snapshots WHERE sprint_name = ? LIMIT 1`).get(sprintName) as { id: number } | undefined;

  const insertHeader = db.prepare(`
    INSERT INTO kpi_team_backlog_snapshots (
      snapshot_date,
      sprint_name,
      pi_name,
      live_area_bugs,
      source,
      created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertRow = db.prepare(`
    INSERT INTO kpi_team_backlog_snapshot_rows (
      snapshot_id,
      team,
      objective,
      gc_bugs,
      new_bugs,
      active_bugs,
      resolved_bugs,
      co_bugs,
      iw_bugs,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const updateHeader = db.prepare(`
    UPDATE kpi_team_backlog_snapshots
    SET snapshot_date = ?,
        pi_name = ?,
        live_area_bugs = ?,
        source = ?,
        created_at = datetime('now')
    WHERE id = ?
  `);
  const deleteRows = db.prepare(`
    DELETE FROM kpi_team_backlog_snapshot_rows
    WHERE snapshot_id = ?
  `);

  const rows = backlog.teams.map(teamToSnapshotRow);

  const snapshotId = db.transaction(() => {
    if (existing) {
      updateHeader.run(
        snapshotDate,
        extractPiName(sprintName),
        liveAreaBugs,
        trigger,
        existing.id,
      );
      deleteRows.run(existing.id);
      for (const row of rows) {
        insertRow.run(
          existing.id,
          row.team,
          row.objective,
          row.gc_bugs,
          row.new_bugs,
          row.active_bugs,
          row.resolved_bugs,
          row.co_bugs,
          row.iw_bugs,
        );
      }
      return existing.id;
    }

    const header = insertHeader.run(
      snapshotDate,
      sprintName,
      extractPiName(sprintName),
      liveAreaBugs,
      trigger,
    );
    const id = Number(header.lastInsertRowid);

    for (const row of rows) {
      insertRow.run(
        id,
        row.team,
        row.objective,
        row.gc_bugs,
        row.new_bugs,
        row.active_bugs,
        row.resolved_bugs,
        row.co_bugs,
        row.iw_bugs,
      );
    }

    return id;
  })();

  return {
    captured: true,
    reason: existing ? 'updated_existing' : 'captured',
    sprintName,
    snapshotDate,
    snapshotId,
    liveAreaBugs,
  };
}

export function listKpiTeamBacklogHistory(limit = 60): TeamBacklogHistoryResponse {
  const db = getDb();
  ensureKpiHistorySchema(db);
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(260, Math.trunc(limit))) : 60;

  const snapshots = db.prepare(`
    SELECT
      id,
      snapshot_date,
      sprint_name,
      pi_name,
      source,
      live_area_bugs
    FROM kpi_team_backlog_snapshots
    ORDER BY snapshot_date DESC, id DESC
    LIMIT ?
  `).all(safeLimit) as Array<{
    id: number;
    snapshot_date: string;
    sprint_name: string;
    pi_name: string | null;
    source: string;
    live_area_bugs: number;
  }>;

  if (snapshots.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      teamOrder: [...TEAM_ORDER],
      snapshots: [],
    };
  }

  const ids = snapshots.map((s) => s.id);
  const placeholders = ids.map(() => '?').join(',');

  const rows = db.prepare(`
    SELECT
      snapshot_id,
      team,
      objective,
      gc_bugs,
      new_bugs,
      active_bugs,
      resolved_bugs,
      co_bugs,
      iw_bugs
    FROM kpi_team_backlog_snapshot_rows
    WHERE snapshot_id IN (${placeholders})
    ORDER BY snapshot_id DESC, team ASC
  `).all(...ids) as Array<{
    snapshot_id: number;
    team: string;
    objective: number;
    gc_bugs: number;
    new_bugs: number;
    active_bugs: number;
    resolved_bugs: number;
    co_bugs: number;
    iw_bugs: number;
  }>;

  const rowsBySnapshot = new Map<number, TeamBacklogSnapshotRow[]>();
  for (const row of rows) {
    const arr = rowsBySnapshot.get(row.snapshot_id) ?? [];
    arr.push({
      team: row.team,
      objective: row.objective,
      gc_bugs: row.gc_bugs,
      new_bugs: row.new_bugs,
      active_bugs: row.active_bugs,
      resolved_bugs: row.resolved_bugs,
      co_bugs: row.co_bugs,
      iw_bugs: row.iw_bugs,
    });
    rowsBySnapshot.set(row.snapshot_id, arr);
  }

  const materialized = snapshots.map((snap) => {
    const raw = rowsBySnapshot.get(snap.id) ?? [];
    const byTeam = new Map(raw.map((r) => [r.team, r] as const));
    const orderedRows = TEAM_ORDER
      .map((team) => byTeam.get(team))
      .filter((row): row is TeamBacklogSnapshotRow => Boolean(row));

    return {
      id: snap.id,
      snapshot_date: snap.snapshot_date,
      sprint_name: snap.sprint_name,
      pi_name: snap.pi_name,
      source: snap.source,
      live_area_bugs: snap.live_area_bugs,
      teams: orderedRows,
    } satisfies TeamBacklogSnapshot;
  });

  return {
    generatedAt: new Date().toISOString(),
    teamOrder: [...TEAM_ORDER],
    snapshots: materialized,
  };
}
