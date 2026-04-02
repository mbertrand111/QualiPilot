import type Database from 'better-sqlite3';
import { classifyBug } from './bugClassifier';
import type { PiWindow } from '../config/sprints';
import { getConfiguredPiWindows } from './sprintCalendar';

type BugRow = {
  id: number;
  title: string | null;
  state: string | null;
  team: string | null;
  sprint: string | null;
  raison_origine: string | null;
  created_date: string | null;
  resolved_date: string | null;
  closed_date: string | null;
  changed_date: string | null;
  version_souhaitee: string | null;
  found_in: string | null;
};

type DefectDebtRow = {
  pi: string;
  global: number;
  live: number;
  onpremise: number;
  hors: number;
  openedGlobal: number;
  closedGlobal: number;
  openedLive: number;
  closedLive: number;
  openedOnpremise: number;
  closedOnpremise: number;
  openedHors: number;
  closedHors: number;
  endGlobal: number;
  endLive: number;
  endOnpremise: number;
  endHors: number;
};

type BacklogEvolutionRow = {
  date: string;
  label: string;
  total: number;
  live: number;
  onpremise: number;
  hors: number;
};
export type BacklogGranularity = 'month' | 'week' | 'day';

type ReleaseProduct = 'live' | 'onpremise' | 'hors_version' | 'uncategorized';
type PointBug = {
  id: number;
  title: string;
  state: string;
  team: string;
  sprint: string;
  version: string;
  majorVersion: string;
  patch: string | null;
  product: ReleaseProduct;
};
type PointBacklogResult = {
  products: Array<{ value: ReleaseProduct; label: string }>;
  bugs: PointBug[];
};

type ClosedByPiResult = {
  teams: string[];
  byProduct: Array<{
    pi: string;
    live: number;
    livePatch: number;
    onpremise: number;
    onpremisePatch: number;
    horsVersion: number;
    nonCategorise: number;
    total: number;
  }>;
  byTeam: Array<Record<string, number | string>>;
};

export type TerrainReturnsRow = {
  exercise: string;
  label: string;
  start: string;
  end: string;
  asOf: string;
  entrants: number;
  corrected: number;
  isCurrent: boolean;
};

export type TerrainReturnsResult = {
  asOfDate: string;
  rows: TerrainReturnsRow[];
};

export type TeamBacklog = {
  team: string;
  objective: number;
  gcBugs: number;
  newBugs: number;
  activeBugs: number;
  resolvedBugs: number;
  coBugs: number;
  iwBugs: number;
  topVersions: { version: string; count: number }[];
};

export type TeamBacklogBug = {
  id: number;
  title: string;
  state: string;
  version: string;
  team: string;
  sprint: string;
  filiere: 'GC' | 'CO' | 'IW';
  createdDate: string | null;
  changedDate: string | null;
};

export type TeamBacklogsResult = {
  teams: TeamBacklog[];
  bugs: TeamBacklogBug[];
};

const TEAM_LIST = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];

const DEFAULT_TEAM_OBJECTIVES: Record<string, number> = {
  'COCO': 8,
  'GO FAHST': 5,
  'JURASSIC BACK': 8,
  'MAGIC SYSTEM': 20,
  'MELI MELO': 8,
  'NULL.REF': 10,
  'PIXELS': 7,
  'LACE': 10,
};

const TEAM_NAME_NORMALIZE: Record<string, string> = {
  'GO_FAHST': 'GO FAHST',
  'JURASSIC_BACK': 'JURASSIC BACK',
  'MAGIC_SYSTEM': 'MAGIC SYSTEM',
  'MELI_MELO': 'MELI MELO',
  'NULL_REF': 'NULL.REF',
  'NULLREF': 'NULL.REF',
};

function normalizeTeam(rawTeam: string | null): string {
  if (!rawTeam) return 'Non affecte';
  const trimmed = rawTeam.trim();
  if (!trimmed) return 'Non affecte';
  const normalizedKey = trimmed
    .toUpperCase()
    .replace(/[.\s_]+/g, '_');
  return TEAM_NAME_NORMALIZE[normalizedKey] ?? trimmed;
}

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

function releaseProduct(versionSouhaitee: string | null, foundIn: string | null): ReleaseProduct {
  const bugType = classifyBug(versionSouhaitee, foundIn);
  if (bugType === 'live' || bugType === 'onpremise' || bugType === 'hors_version') return bugType;
  return 'uncategorized';
}

function toDateMs(input: string | null): number | null {
  if (!input) return null;
  const parsed = Date.parse(input);
  return Number.isNaN(parsed) ? null : parsed;
}

function startOfDayMs(yyyyMmDd: string): number {
  return Date.parse(`${yyyyMmDd}T00:00:00.000Z`);
}

function endOfDayMs(yyyyMmDd: string): number {
  return Date.parse(`${yyyyMmDd}T23:59:59.999Z`);
}

function closureDateMs(bug: BugRow): number | null {
  return toDateMs(bug.closed_date) ?? toDateMs(bug.resolved_date) ?? null;
}

function isOpenAtMs(bug: BugRow, atMs: number): boolean {
  const createdMs = toDateMs(bug.created_date);
  if (createdMs === null || createdMs > atMs) return false;
  const closeMs = closureDateMs(bug);
  return closeMs === null || closeMs > atMs;
}

function classifyProduct(versionSouhaitee: string | null): 'live' | 'livePatch' | 'onpremise' | 'onpremisePatch' | 'horsVersion' | 'nonCategorise' {
  const version = (versionSouhaitee ?? '').trim();
  const lower = version.toLowerCase();
  if (!lower || lower === '-') return 'nonCategorise';
  if (lower === 'non concerne' || lower === 'non concerné') return 'horsVersion';
  if (lower.includes('fah') && lower.includes('patch')) return 'livePatch';
  if (lower.includes('fah')) return 'live';
  if (lower.includes('13.8') && lower.includes('patch')) return 'onpremisePatch';
  if (lower.includes('13.8')) return 'onpremise';
  return 'nonCategorise';
}

function classifyFiliere(title: string | null): 'CO' | 'IW' | 'GC' {
  const t = (title ?? '').toUpperCase();
  if (t.includes('[CO]')) return 'CO';
  if (t.includes('[IW]')) return 'IW';
  return 'GC';
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeTextToken(value: string | null): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function isTerrainReturnBug(bug: BugRow): boolean {
  const token = normalizeTextToken(bug.raison_origine);
  return token === 'retoursclients';
}

function toIsoDateFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function monthYearShortFromMs(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear()).slice(2);
  return `${month}/${year}`;
}

function mapDateToPiLabel(ms: number, windows: PiWindow[]): string | null {
  for (const w of windows) {
    const start = startOfDayMs(w.start);
    const end = endOfDayMs(w.end);
    if (ms >= start && ms <= end) return w.label;
  }
  return null;
}

function loadRows(db: Database.Database): BugRow[] {
  return db.prepare(`
    SELECT
      id, title, state, team, sprint,
      raison_origine,
      created_date, resolved_date, closed_date, changed_date,
      version_souhaitee, found_in
    FROM bugs_cache
  `).all() as BugRow[];
}

function activePiWindows(db: Database.Database): PiWindow[] {
  const now = Date.now();
  return getConfiguredPiWindows(db).filter((w) => startOfDayMs(w.start) <= now);
}

export function defectDebtByPi(db: Database.Database): DefectDebtRow[] {
  const rows = loadRows(db);
  const windows = activePiWindows(db);

  return windows.map((window) => {
    const startMs = startOfDayMs(window.start);
    const endMs = endOfDayMs(window.end);

    let createdGlobal = 0;
    let createdLive = 0;
    let createdOnPrem = 0;
    let createdHors = 0;

    let closedGlobal = 0;
    let closedLive = 0;
    let closedOnPrem = 0;
    let closedHors = 0;

    let endGlobal = 0;
    let endLive = 0;
    let endOnPrem = 0;
    let endHors = 0;

    for (const row of rows) {
      const bugType = classifyBug(row.version_souhaitee, row.found_in);
      const createdMs = toDateMs(row.created_date);
      const closeMs = closureDateMs(row);
      const closedState = row.state === 'Closed' || row.state === 'Resolved';

      if (createdMs !== null && createdMs >= startMs && createdMs <= endMs) {
        createdGlobal += 1;
        if (bugType === 'live') createdLive += 1;
        if (bugType === 'onpremise') createdOnPrem += 1;
        if (bugType === 'hors_version') createdHors += 1;
      }

      if (closedState && closeMs !== null && closeMs >= startMs && closeMs <= endMs) {
        closedGlobal += 1;
        if (bugType === 'live') closedLive += 1;
        if (bugType === 'onpremise') closedOnPrem += 1;
        if (bugType === 'hors_version') closedHors += 1;
      }

      if (isOpenAtMs(row, endMs)) {
        endGlobal += 1;
        if (bugType === 'live') endLive += 1;
        if (bugType === 'onpremise') endOnPrem += 1;
        if (bugType === 'hors_version') endHors += 1;
      }
    }

    return {
      pi: window.label,
      global: createdGlobal - closedGlobal,
      live: createdLive - closedLive,
      onpremise: createdOnPrem - closedOnPrem,
      hors: createdHors - closedHors,
      openedGlobal: createdGlobal,
      closedGlobal,
      openedLive: createdLive,
      closedLive,
      openedOnpremise: createdOnPrem,
      closedOnpremise: closedOnPrem,
      openedHors: createdHors,
      closedHors,
      endGlobal,
      endLive,
      endOnpremise: endOnPrem,
      endHors,
    };
  });
}

export function backlogEvolution(
  db: Database.Database,
  months = 12,
  granularity: BacklogGranularity = 'week',
): BacklogEvolutionRow[] {
  const rows = loadRows(db);
  const safeMonths = Math.max(1, Math.min(36, Math.trunc(months)));

  const out: BacklogEvolutionRow[] = [];
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const startMonth = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - (safeMonths - 1), 1, 0, 0, 0, 0));

  const pushSnapshot = (pointDate: Date, label: string) => {
    const pointIso = toIsoDate(pointDate);
    const snapshotMs = Math.min(Date.now(), pointDate.getTime() + (24 * 60 * 60 * 1000) - 1);

    let total = 0;
    let live = 0;
    let onpremise = 0;
    let hors = 0;

    for (const row of rows) {
      if (!isOpenAtMs(row, snapshotMs)) continue;
      total += 1;
      const bugType = classifyBug(row.version_souhaitee, row.found_in);
      if (bugType === 'live') live += 1;
      else if (bugType === 'onpremise') onpremise += 1;
      else if (bugType === 'hors_version') hors += 1;
    }

    out.push({
      date: pointIso,
      label,
      total,
      live,
      onpremise,
      hors,
    });
  };

  if (granularity === 'month') {
    for (let i = 0; i < safeMonths; i += 1) {
      const monthDate = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1, 0, 0, 0, 0));
      pushSnapshot(monthDate, formatMonthLabel(monthDate));
    }
    return out;
  }

  const stepDays = granularity === 'day' ? 1 : 7;
  let lastPointMs = -1;
  for (
    let pointDate = new Date(startMonth);
    pointDate.getTime() <= todayUtc.getTime();
    pointDate = new Date(pointDate.getTime() + (stepDays * 24 * 60 * 60 * 1000))
  ) {
    pushSnapshot(pointDate, formatDayLabel(pointDate));
    lastPointMs = pointDate.getTime();
  }

  if (lastPointMs !== todayUtc.getTime()) {
    pushSnapshot(todayUtc, formatDayLabel(todayUtc));
  }

  return out;
}

export function pointBacklog(db: Database.Database): PointBacklogResult {
  const rows = loadRows(db);
  const bugs: PointBug[] = [];

  for (const row of rows) {
    const state = (row.state ?? 'Unknown').trim() || 'Unknown';
    const team = normalizeTeam(row.team);
    const sprint = row.sprint?.trim() || '-';
    const version = normalizeVersion(row.version_souhaitee);
    const { majorVersion, patch } = splitMajorAndPatch(version);
    const product = releaseProduct(row.version_souhaitee, row.found_in);

    bugs.push({
      id: row.id,
      title: row.title?.trim() || '(sans titre)',
      state,
      team,
      sprint,
      version,
      majorVersion,
      patch,
      product,
    });
  }

  bugs.sort((a, b) => a.id - b.id);

  return {
    products: [
      { value: 'live', label: 'Live' },
      { value: 'onpremise', label: 'On prem' },
      { value: 'hors_version', label: 'Hors version' },
    ],
    bugs,
  };
}

export function closedByPi(db: Database.Database): ClosedByPiResult {
  const rows = loadRows(db);
  const windows = activePiWindows(db);

  const baseByProduct = windows.map((w) => ({
    pi: w.label,
    live: 0,
    livePatch: 0,
    onpremise: 0,
    onpremisePatch: 0,
    horsVersion: 0,
    nonCategorise: 0,
    total: 0,
  }));
  const baseByTeam: Array<Record<string, number | string>> = windows.map((w) => {
    const row: Record<string, number | string> = { pi: w.label, total: 0 };
    for (const team of TEAM_LIST) row[team] = 0;
    return row;
  });

  const byProductMap = new Map(baseByProduct.map((r) => [r.pi, r]));
  const byTeamMap = new Map(baseByTeam.map((r) => [String(r.pi), r]));

  for (const bug of rows) {
    const closedState = bug.state === 'Closed' || bug.state === 'Resolved';
    if (!closedState) continue;

    const closeMs = closureDateMs(bug) ?? toDateMs(bug.changed_date);
    if (closeMs === null) continue;

    const pi = mapDateToPiLabel(closeMs, windows);
    if (!pi) continue;

    const product = classifyProduct(bug.version_souhaitee);
    const productRow = byProductMap.get(pi);
    if (productRow) {
      productRow[product] += 1;
      productRow.total += 1;
    }

    const teamRow = byTeamMap.get(pi);
    const team = normalizeTeam(bug.team);
    if (teamRow) {
      if (TEAM_LIST.includes(team)) {
        teamRow[team] = Number(teamRow[team] ?? 0) + 1;
      }
      teamRow.total = Number(teamRow.total ?? 0) + 1;
    }
  }

  const byProduct = baseByProduct.filter((r) => r.total > 0);
  const byTeam = baseByTeam.filter((r) => Number(r.total) > 0);
  return { teams: TEAM_LIST, byProduct, byTeam };
}

type ExerciseWindow = {
  startYear: number;
  exercise: string;
  start: string;
  end: string;
  startMs: number;
  endMs: number;
};

function buildExerciseWindow(startYear: number): ExerciseWindow {
  const endYear = startYear + 1;
  const yy = String(startYear).slice(2);
  const yyNext = String(endYear).slice(2);
  const exercise = `${yy}-${yyNext}`;

  let start = `${startYear}-07-15`;
  let end = `${endYear}-07-14`;

  // Exception metier demandee:
  // - Exercice 24-25: du 15/07/2024 au 03/08/2025
  // - Exercice 25-26: demarre le 04/08/2025
  if (startYear === 2024) end = '2025-08-03';
  if (startYear === 2025) start = '2025-08-04';

  return {
    startYear,
    exercise,
    start,
    end,
    startMs: startOfDayMs(start),
    endMs: endOfDayMs(end),
  };
}

export function terrainReturnsByExercise(db: Database.Database): TerrainReturnsResult {
  const rows = loadRows(db).filter((bug) => isTerrainReturnBug(bug));
  const asOfDate = toIsoDateFromMs(Date.now());
  const todayEndMs = endOfDayMs(asOfDate);
  const FIRST_EXERCISE_START_YEAR = 2022; // 22-23

  let minMs = todayEndMs;
  for (const row of rows) {
    const createdMs = toDateMs(row.created_date);
    const correctedMs = closureDateMs(row) ?? toDateMs(row.changed_date);
    if (createdMs !== null) minMs = Math.min(minMs, createdMs);
    if (correctedMs !== null) minMs = Math.min(minMs, correctedMs);
  }

  const minYear = Math.max(FIRST_EXERCISE_START_YEAR, new Date(minMs).getUTCFullYear() - 1);
  const maxYear = new Date(todayEndMs).getUTCFullYear() + 1;
  const windows: ExerciseWindow[] = [];

  for (let year = minYear; year <= maxYear; year += 1) {
    const window = buildExerciseWindow(year);
    if (window.startMs <= todayEndMs) windows.push(window);
  }

  const out: TerrainReturnsRow[] = [];

  for (const window of windows) {
    let entrants = 0;
    let corrected = 0;

    for (const bug of rows) {
      const createdMs = toDateMs(bug.created_date);
      if (createdMs !== null && createdMs >= window.startMs && createdMs <= window.endMs) {
        entrants += 1;
      }

      const correctedMs = closureDateMs(bug) ?? toDateMs(bug.changed_date);
      const correctedState = bug.state === 'Closed' || bug.state === 'Resolved';
      if (correctedState && correctedMs !== null && correctedMs >= window.startMs && correctedMs <= window.endMs) {
        corrected += 1;
      }
    }

    const isCurrent = todayEndMs >= window.startMs && todayEndMs <= window.endMs;
    const asOfMs = isCurrent ? todayEndMs : window.endMs;
    const label = isCurrent ? `${window.exercise} a fin ${monthYearShortFromMs(asOfMs)}` : window.exercise;

    if (entrants > 0 || corrected > 0 || isCurrent) {
      out.push({
        exercise: window.exercise,
        label,
        start: window.start,
        end: window.end,
        asOf: toIsoDateFromMs(asOfMs),
        entrants,
        corrected,
        isCurrent,
      });
    }
  }

  return { asOfDate, rows: out };
}

export function teamBacklogs(db: Database.Database): TeamBacklogsResult {
  const rows = loadRows(db).filter((row) => row.state !== 'Closed');

  const objectiveRows = db.prepare(`
    SELECT t.name AS team_name, tso.max_bugs
    FROM team_sprint_objectives tso
    JOIN teams t ON t.id = tso.team_id
    WHERE t.active = 1
    ORDER BY tso.created_at DESC
  `).all() as { team_name: string; max_bugs: number }[];

  const objectiveMap = new Map<string, number>();
  for (const row of objectiveRows) {
    const team = normalizeTeam(row.team_name);
    if (!objectiveMap.has(team)) objectiveMap.set(team, row.max_bugs);
  }

  const acc = new Map<string, TeamBacklog>();
  for (const team of TEAM_LIST) {
    acc.set(team, {
      team,
      objective: objectiveMap.get(team) ?? DEFAULT_TEAM_OBJECTIVES[team] ?? 10,
      gcBugs: 0,
      newBugs: 0,
      activeBugs: 0,
      resolvedBugs: 0,
      coBugs: 0,
      iwBugs: 0,
      topVersions: [],
    });
  }

  const versionCounts = new Map<string, Map<string, number>>();
  const bugs: TeamBacklogBug[] = [];

  for (const row of rows) {
    const team = normalizeTeam(row.team);
    if (!TEAM_LIST.includes(team)) continue;

    const entry = acc.get(team);
    if (!entry) continue;

    const filiere = classifyFiliere(row.title);
    bugs.push({
      id: row.id,
      title: row.title?.trim() || '(sans titre)',
      state: row.state?.trim() || 'Unknown',
      version: normalizeVersion(row.version_souhaitee),
      team,
      sprint: row.sprint?.trim() || '-',
      filiere,
      createdDate: row.created_date,
      changedDate: row.changed_date,
    });

    if (filiere === 'CO') {
      entry.coBugs += 1;
      continue;
    }
    if (filiere === 'IW') {
      entry.iwBugs += 1;
      continue;
    }

    if (row.state === 'New') {
      entry.gcBugs += 1;
      entry.newBugs += 1;
    } else if (row.state === 'Active') {
      entry.gcBugs += 1;
      entry.activeBugs += 1;
    } else if (row.state === 'Resolved') {
      entry.resolvedBugs += 1;
    }

    // Les barres de versions doivent suivre le compteur GC (New + Active uniquement).
    if (row.state === 'New' || row.state === 'Active') {
      const teamVersions = versionCounts.get(team) ?? new Map<string, number>();
      const version = normalizeVersion(row.version_souhaitee);
      teamVersions.set(version, (teamVersions.get(version) ?? 0) + 1);
      versionCounts.set(team, teamVersions);
    }
  }

  for (const team of TEAM_LIST) {
    const entry = acc.get(team);
    if (!entry) continue;
    const counts = [...(versionCounts.get(team)?.entries() ?? [])]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([version, count]) => ({ version, count }));
    entry.topVersions = counts;
  }

  bugs.sort((a, b) => {
    const aChanged = a.changedDate ? Date.parse(a.changedDate) : Number.NEGATIVE_INFINITY;
    const bChanged = b.changedDate ? Date.parse(b.changedDate) : Number.NEGATIVE_INFINITY;
    if (aChanged !== bChanged) return bChanged - aChanged;

    const aCreated = a.createdDate ? Date.parse(a.createdDate) : Number.NEGATIVE_INFINITY;
    const bCreated = b.createdDate ? Date.parse(b.createdDate) : Number.NEGATIVE_INFINITY;
    if (aCreated !== bCreated) return bCreated - aCreated;
    return a.id - b.id;
  });

  return {
    teams: TEAM_LIST.map((team) => acc.get(team) as TeamBacklog),
    bugs,
  };
}
