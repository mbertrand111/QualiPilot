import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { MultiSelect } from '../components/MultiSelect';
import { SyncButton } from '../components/SyncButton';
import { useSyncAndEvaluate } from '../hooks/useSyncAndEvaluate';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, AreaChart, Area, PieChart, Pie, ReferenceLine, LabelList,
  ResponsiveContainer, Legend,
} from 'recharts';

// â”€â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TABS = [
  { key: 'defect-debt',    label: 'Defect Debt'         },
  { key: 'backlog-evo',   label: 'Evolution backlog' },
  { key: 'suivi-release',  label: 'Suivi par release'    },
  { key: 'suivi-pi',      label: 'Suivi par PI' },
  { key: 'closed-by-pi',  label: 'Bugs fermes par PI' },
  { key: 'team-backlogs', label: 'Backlogs équipes' },
  { key: 'retention', label: 'Rétention bugs' },
  { key: 'terrain-returns', label: 'Retours terrain' },
] as const;
type TabKey = typeof TABS[number]['key'];

// â”€â”€â”€ Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const C = {
  live:            '#EC4899',
  livePatch:       '#F9A8D4',
  onpremise:       '#6B7280',
  onpremisePatch:  '#9CA3AF',
  horsVersion:     '#7C3AED',
  nonCategorise:   '#1E3A5F',
  stateNew:        '#1D4ED8',
  stateActive:     '#D97706',
  stateResolved:   '#7C3AED',
  teams: {
    'COCO':          '#10B981',
    'GO FAHST':      '#3B82F6',
    'JURASSIC BACK': '#EF4444',
    'MAGIC SYSTEM':  '#7C3AED',
    'MELI MELO':     '#EC4899',
    'NULL.REF':      '#F59E0B',
    'PIXELS':        '#14B8A6',
    'LACE':          '#6366F1',
  } as Record<string, string>,
};

// â”€â”€â”€ Mock Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DefectDebtPiRow {
  pi: string;
  global: number;
  live: number;
  onpremise: number;
  hors: number;
  openedGlobal: number;
  closedGlobal: number;
  correctedSamePiGlobal: number;
  openedLive: number;
  closedLive: number;
  correctedSamePiLive: number;
  openedOnpremise: number;
  closedOnpremise: number;
  correctedSamePiOnpremise: number;
  openedHors: number;
  closedHors: number;
  correctedSamePiHors: number;
  endGlobal: number;
  endLive: number;
  endOnpremise: number;
  endHors: number;
}

interface BacklogEvolutionPoint {
  date: string;
  label?: string;
  total: number;
  live: number;
  onpremise: number;
  hors: number;
}

// Tab 1 â€” Defect Debt (crees - fermes par PI)
const DD_RAW: DefectDebtPiRow[] = [
  { pi: '24-25 PI4', global:  120, live:  55, onpremise: -10, hors:   2, openedGlobal: 390, closedGlobal: 270, correctedSamePiGlobal: 210, openedLive: 180, closedLive: 125, correctedSamePiLive: 98, openedOnpremise: 90, closedOnpremise: 100, correctedSamePiOnpremise: 70, openedHors: 18, closedHors: 16, correctedSamePiHors: 9, endGlobal: 340, endLive:  85, endOnpremise: 230, endHors: 25 },
  { pi: '24-25 PI5', global: -180, live: -45, onpremise:  -8, hors:  -3, openedGlobal: 260, closedGlobal: 440, correctedSamePiGlobal: 145, openedLive: 90, closedLive: 135, correctedSamePiLive: 49, openedOnpremise: 84, closedOnpremise: 92, correctedSamePiOnpremise: 52, openedHors: 20, closedHors: 23, correctedSamePiHors: 11, endGlobal: 295, endLive:  65, endOnpremise: 210, endHors: 20 },
  { pi: '24-25 PI6', global: -290, live: -80, onpremise:   5, hors:   5, openedGlobal: 210, closedGlobal: 500, correctedSamePiGlobal: 118, openedLive: 60, closedLive: 140, correctedSamePiLive: 33, openedOnpremise: 98, closedOnpremise: 93, correctedSamePiOnpremise: 58, openedHors: 22, closedHors: 17, correctedSamePiHors: 13, endGlobal: 420, endLive: 120, endOnpremise: 270, endHors: 30 },
  { pi: '25-26 PI1', global:  180, live:  60, onpremise:  35, hors:   4, openedGlobal: 430, closedGlobal: 250, correctedSamePiGlobal: 256, openedLive: 210, closedLive: 150, correctedSamePiLive: 124, openedOnpremise: 130, closedOnpremise: 95, correctedSamePiOnpremise: 82, openedHors: 24, closedHors: 20, correctedSamePiHors: 14, endGlobal: 265, endLive: 100, endOnpremise: 140, endHors: 25 },
  { pi: '25-26 PI2', global: -160, live: -75, onpremise: -22, hors:  -5, openedGlobal: 255, closedGlobal: 415, correctedSamePiGlobal: 138, openedLive: 95, closedLive: 170, correctedSamePiLive: 54, openedOnpremise: 75, closedOnpremise: 97, correctedSamePiOnpremise: 43, openedHors: 18, closedHors: 23, correctedSamePiHors: 9, endGlobal: 220, endLive:  95, endOnpremise: 108, endHors: 17 },
  { pi: '25-26 PI3', global:   35, live:  12, onpremise:   8, hors:   1, openedGlobal: 286, closedGlobal: 251, correctedSamePiGlobal: 170, openedLive: 132, closedLive: 120, correctedSamePiLive: 81, openedOnpremise: 92, closedOnpremise: 84, correctedSamePiOnpremise: 58, openedHors: 17, closedHors: 16, correctedSamePiHors: 10, endGlobal: 247, endLive: 107, endOnpremise: 122, endHors: 18 },
  { pi: '25-26 PI4', global:   48, live:  18, onpremise:  10, hors:   2, openedGlobal: 300, closedGlobal: 252, correctedSamePiGlobal: 182, openedLive: 138, closedLive: 120, correctedSamePiLive: 84, openedOnpremise: 94, closedOnpremise: 84, correctedSamePiOnpremise: 60, openedHors: 19, closedHors: 17, correctedSamePiHors: 11, endGlobal: 252, endLive: 110, endOnpremise: 124, endHors: 18 },
];

// Tab 2 â€” Backlog evolution (snapshots mensuels)
const BACKLOG_EVO: BacklogEvolutionPoint[] = [
  { date: '2025-04-01', label: 'Avr 25', total: 335, live: 62,  onpremise: 254, hors: 19 },
  { date: '2025-05-01', label: 'Mai 25', total: 340, live: 65,  onpremise: 256, hors: 19 },
  { date: '2025-06-01', label: 'Jun 25', total: 347, live: 68,  onpremise: 260, hors: 19 },
  { date: '2025-07-01', label: 'Jul 25', total: 410, live: 72,  onpremise: 318, hors: 20 },
  { date: '2025-08-01', label: 'Aou 25', total: 265, live: 88,  onpremise: 157, hors: 20 },
  { date: '2025-09-01', label: 'Sep 25', total: 248, live: 92,  onpremise: 138, hors: 18 },
  { date: '2025-10-01', label: 'Oct 25', total: 242, live: 95,  onpremise: 130, hors: 17 },
  { date: '2025-11-01', label: 'Nov 25', total: 228, live: 92,  onpremise: 119, hors: 17 },
  { date: '2025-12-01', label: 'Dec 25', total: 220, live: 90,  onpremise: 113, hors: 17 },
  { date: '2026-01-01', label: 'Jan 26', total: 230, live: 95,  onpremise: 117, hors: 18 },
  { date: '2026-02-01', label: 'Fev 26', total: 242, live: 100, onpremise: 123, hors: 19 },
  { date: '2026-03-01', label: 'Mar 26', total: 252, live: 107, onpremise: 127, hors: 18 },
];

// Tab 3 â€” Suivi par release
type ReleaseProduct = 'live' | 'onpremise' | 'hors_version' | 'uncategorized';
interface ReleaseBug {
  id: number;
  title: string;
  state: string;
  team: string;
  sprint: string;
  version: string;
  majorVersion: string;
  patch: string | null;
  product: ReleaseProduct;
}
interface PointBacklogResponse {
  products: Array<{ value: ReleaseProduct; label: string }>;
  bugs: ReleaseBug[];
}

interface PiFollowupWindow {
  label: string;
  start: string;
  end: string;
  started: boolean;
  completed: boolean;
}

interface PiFollowupBug extends ReleaseBug {
  createdDate: string | null;
  resolvedDate: string | null;
  closedDate: string | null;
  createdPi: string | null;
  resolvedPi: string | null;
  closedPi: string | null;
}

interface PiFollowupResponse {
  piWindows: PiFollowupWindow[];
  defaultPi: string;
  bugs: PiFollowupBug[];
}

type PiEventKey = 'created' | 'closed';

interface ReleaseVersionSettingsResponse {
  versions: Array<{ version: string; selected: boolean }>;
  alwaysVisible: string[];
}

interface PersistedReleaseFilters {
  products: ReleaseProduct[];
  versions: string[];
  patches: string[];
}

interface PersistedPiFollowupFilters extends PersistedReleaseFilters {
  piLabel: string | null;
  events: PiEventKey[];
}

const DEFAULT_RELEASE_STATES = ['New', 'Active', 'Resolved', 'Closed'] as const;

function majorVersionMatchesProduct(majorVersion: string, product: ReleaseProduct): boolean {
  if (majorVersion === 'vide' || majorVersion === 'Non concerne') return true;
  const isFah = /^FAH_/i.test(majorVersion);
  if (product === 'live') return isFah;
  if (product === 'onpremise') return !isFah;
  if (product === 'hors_version') return majorVersion === 'vide' || majorVersion === 'Non concerne';
  return true;
}

const RELEASE_FILTERS_STORAGE_KEY = 'kpis.suiviRelease.filters.v1';
const PI_FOLLOWUP_FILTERS_STORAGE_KEY = 'kpis.suiviPi.filters.v1';
const PI_EVENTS: PiEventKey[] = ['created', 'closed'];
const PI_EVENT_LABEL: Record<PiEventKey, string> = {
  created: 'Créés',
  closed: 'Fermés',
};
const PI_EVENT_COLORS: Record<PiEventKey, string> = {
  created: '#1D4ED8',
  closed: '#0EA5A3',
};
const PI_EVENT_BAR_COLORS: Record<PiEventKey, string> = {
  created: '#B9D8FF',
  closed: '#F8C3D7',
};

function loadPersistedReleaseFilters(): PersistedReleaseFilters {
  try {
    const raw = localStorage.getItem(RELEASE_FILTERS_STORAGE_KEY);
    if (!raw) return { products: [], versions: [], patches: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedReleaseFilters>;

    return {
      products: Array.isArray(parsed.products) ? parsed.products.filter((p): p is ReleaseProduct => typeof p === 'string') : [],
      versions: Array.isArray(parsed.versions) ? parsed.versions.filter((v): v is string => typeof v === 'string') : [],
      patches: Array.isArray(parsed.patches) ? parsed.patches.filter((v): v is string => typeof v === 'string') : [],
    };
  } catch {
    return { products: [], versions: [], patches: [] };
  }
}

function savePersistedReleaseFilters(filters: PersistedReleaseFilters): void {
  try {
    localStorage.setItem(RELEASE_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // no-op
  }
}

function loadPersistedPiFollowupFilters(): PersistedPiFollowupFilters {
  try {
    const raw = localStorage.getItem(PI_FOLLOWUP_FILTERS_STORAGE_KEY);
    if (!raw) return { piLabel: null, events: [...PI_EVENTS], products: [], versions: [], patches: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedPiFollowupFilters>;
    const events = Array.isArray(parsed.events)
      ? parsed.events.filter((e): e is PiEventKey => e === 'created' || e === 'closed')
      : [];
    return {
      piLabel: typeof parsed.piLabel === 'string' ? parsed.piLabel : null,
      events: events.length > 0 ? events : [...PI_EVENTS],
      products: Array.isArray(parsed.products) ? parsed.products.filter((p): p is ReleaseProduct => typeof p === 'string') : [],
      versions: Array.isArray(parsed.versions) ? parsed.versions.filter((v): v is string => typeof v === 'string') : [],
      patches: Array.isArray(parsed.patches) ? parsed.patches.filter((v): v is string => typeof v === 'string') : [],
    };
  } catch {
    return { piLabel: null, events: [...PI_EVENTS], products: [], versions: [], patches: [] };
  }
}

function savePersistedPiFollowupFilters(filters: PersistedPiFollowupFilters): void {
  try {
    localStorage.setItem(PI_FOLLOWUP_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // no-op
  }
}

// Tab 4 â€” Bugs fermes par PI
const CLOSED_PRODUIT = [
  { pi: '24-25 PI6', live: 68, livePatch: 28, onpremise: 48, onpremisePatch:  0, horsVersion: 0, nonCategorise: 30, total: 174 },
  { pi: '25-26 PI1', live: 150, livePatch:  0, onpremise: 35, onpremisePatch: 12, horsVersion: 0, nonCategorise:  1, total: 198 },
  { pi: '25-26 PI2', live:  75, livePatch: 10, onpremise: 22, onpremisePatch:  5, horsVersion: 0, nonCategorise:  4, total: 116 },
  { pi: '25-26 PI3', live:  70, livePatch:  5, onpremise: 47, onpremisePatch:  7, horsVersion: 0, nonCategorise:  2, total: 131 },
  { pi: '25-26 PI4', live:  70, livePatch: 20, onpremise: 17, onpremisePatch: 22, horsVersion: 1, nonCategorise:  5, total: 135 },
];
const TEAMS_LIST = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];
const CLOSED_EQUIPE = [
  { pi: '24-25 PI6', COCO: 22, 'GO FAHST': 12, 'JURASSIC BACK': 14, 'MAGIC SYSTEM': 97, 'MELI MELO': 15, 'NULL.REF':  0, PIXELS:  8, LACE:  6, total: 174 },
  { pi: '25-26 PI1', COCO: 19, 'GO FAHST': 16, 'JURASSIC BACK': 55, 'MAGIC SYSTEM': 47, 'MELI MELO': 31, 'NULL.REF':  4, PIXELS: 26, LACE:  0, total: 198 },
  { pi: '25-26 PI2', COCO: 15, 'GO FAHST': 16, 'JURASSIC BACK': 30, 'MAGIC SYSTEM': 18, 'MELI MELO': 18, 'NULL.REF':  6, PIXELS:  8, LACE:  5, total: 116 },
  { pi: '25-26 PI3', COCO: 11, 'GO FAHST': 14, 'JURASSIC BACK': 47, 'MAGIC SYSTEM': 32, 'MELI MELO': 10, 'NULL.REF': 14, PIXELS: 15, LACE:  0, total: 131 },
  { pi: '25-26 PI4', COCO: 11, 'GO FAHST': 12, 'JURASSIC BACK': 36, 'MAGIC SYSTEM': 36, 'MELI MELO': 12, 'NULL.REF':  3, PIXELS: 24, LACE:  1, total: 135 },
];

// Tab 5 - Backlogs équipes (objectifs à configurer dans Paramètres)
interface TerrainReturnsRow {
  exercise: string;
  label: string;
  start: string;
  end: string;
  asOf: string;
  entrants: number;
  corrected: number;
  isCurrent: boolean;
}

const TERRAIN_RETURNS_IMAGE_ROWS: TerrainReturnsRow[] = [
  { exercise: '22-23', label: '22-23', start: '2022-07-15', end: '2023-07-14', asOf: '2023-07-14', entrants: 225, corrected: 123, isCurrent: false },
  { exercise: '23-24', label: '23-24', start: '2023-07-15', end: '2024-07-14', asOf: '2024-07-14', entrants: 322, corrected: 195, isCurrent: false },
  { exercise: '24-25', label: '24-25', start: '2024-07-15', end: '2025-08-03', asOf: '2025-08-03', entrants: 362, corrected: 403, isCurrent: false },
  { exercise: '25-26', label: '25-26 a fin 03/26', start: '2025-08-04', end: '2026-07-14', asOf: '2026-03-31', entrants: 175, corrected: 334, isCurrent: true },
];

// Tab 5 - Backlogs équipes (objectifs à configurer dans Paramètres)
interface TeamBacklog {
  team:        string;
  objective:   number;
  gcBugs:      number;
  newBugs:     number;
  activeBugs:  number;
  resolvedBugs: number;
  coBugs:      number;
  iwBugs:      number;
  topVersions: { version: string; count: number }[];
}
interface TeamBacklogBug {
  id: number;
  title: string;
  state: string;
  version: string;
  team: string;
  sprint: string;
  filiere: 'GC' | 'CO' | 'IW';
  createdDate: string | null;
  changedDate: string | null;
}
interface TeamBacklogsResponse {
  teams: TeamBacklog[];
  bugs: TeamBacklogBug[];
}
type TeamBacklogFiliereFilter = 'GC' | 'CO' | 'IW' | 'CO_IW' | null;
type TeamBacklogSortKey = 'id' | 'title' | 'state' | 'version' | 'team' | 'filiere' | 'sprint' | 'createdDate' | 'changedDate';
type TeamBacklogSortDir = 'asc' | 'desc';

type RetentionSegmentType = 'filiere' | 'product';
type RetentionSegmentKey = 'GC' | 'CO' | 'IW' | 'live' | 'onpremise' | 'hors_version' | 'uncategorized';
interface RetentionBucket {
  bucket: string;
  count: number;
}
interface RetentionSegment {
  key: RetentionSegmentKey;
  label: string;
  total: number;
  openCount: number;
  closedCount: number;
  avgOpenAgeDays: number;
  medianOpenAgeDays: number;
  medianCloseDays: number;
  p90CloseDays: number;
  over60OpenRate: number;
  over90OpenRate: number;
}
interface RetentionDistribution {
  segmentType: RetentionSegmentType;
  segmentKey: RetentionSegmentKey;
  segmentLabel: string;
  buckets: RetentionBucket[];
}
interface RetentionSummary {
  totalBugs: number;
  openCount: number;
  closedCount: number;
  medianCloseDays: number;
  medianOpenAgeDays: number;
  over60OpenRate: number;
  over90OpenRate: number;
}
interface RetentionPeriod {
  exercise: string;
  label: string;
  start: string;
  end: string;
}
interface RetentionResponse {
  asOfDate: string;
  period: RetentionPeriod;
  summary: RetentionSummary;
  filiere: RetentionSegment[];
  product: RetentionSegment[];
  distributions: RetentionDistribution[];
}
const TEAM_BACKLOGS: TeamBacklog[] = [
  { team: 'COCO',          objective:  8, gcBugs:  7, newBugs:  5, activeBugs: 2, resolvedBugs: 0, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 4 }, { version: 'FAH_26.30', count: 2 }, { version: 'vide', count: 1 }] },
  { team: 'GO FAHST',      objective:  5, gcBugs:  6, newBugs:  4, activeBugs: 2, resolvedBugs: 0, coBugs: 2, iwBugs: 3, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: 'FAH_26.30', count: 2 }, { version: 'FAH_26.10', count: 1 }] },
  { team: 'JURASSIC BACK', objective:  8, gcBugs:  6, newBugs:  5, activeBugs: 1, resolvedBugs: 0, coBugs: 0, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: '13.87.200', count: 2 }, { version: 'FAH_26.30', count: 1 }] },
  { team: 'MAGIC SYSTEM',  objective: 20, gcBugs: 18, newBugs: 13, activeBugs: 5, resolvedBugs: 0, coBugs: 1, iwBugs: 0, topVersions: [{ version: '13.87.250', count: 8 }, { version: '13.87.200', count: 6 }, { version: 'FAH_26.20', count: 3 }] },
  { team: 'MELI MELO',     objective:  8, gcBugs:  9, newBugs:  6, activeBugs: 3, resolvedBugs: 0, coBugs: 2, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 5 }, { version: 'FAH_26.30', count: 3 }, { version: 'vide', count: 1 }] },
  { team: 'NULL.REF',      objective: 10, gcBugs: 10, newBugs:  7, activeBugs: 3, resolvedBugs: 0, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 5 }, { version: 'FAH_26.10', count: 3 }, { version: 'FAH_26.30', count: 2 }] },
  { team: 'PIXELS',        objective:  7, gcBugs:  5, newBugs:  4, activeBugs: 1, resolvedBugs: 0, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: 'FAH_26.30', count: 1 }, { version: 'vide', count: 1 }] },
  { team: 'LACE',          objective: 10, gcBugs:  8, newBugs:  6, activeBugs: 2, resolvedBugs: 0, coBugs: 0, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 4 }, { version: 'FAH_26.30', count: 3 }, { version: '13.87.200', count: 1 }] },
];
const ADO_WORK_ITEM_BASE = 'https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/';

// â”€â”€â”€ Shared â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ttStyle() {
  return { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' };
}

const STATE_BADGE: Record<string, string> = {
  New:      'bg-blue-50 text-blue-700 border-blue-200',
  Active:   'bg-amber-50 text-amber-700 border-amber-200',
  Resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  Closed:   'bg-gray-100 text-gray-500 border-gray-200',
};

// â”€â”€â”€ Tab 1 : Defect Debt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DebtRow { pi: string; debt: number; endBugs: number }
interface DebtOpenClosedRow {
  pi: string;
  opened: number;
  closed: number;
  correctedSamePi: number;
  openedRemaining: number;
  closedFromOutside: number;
}

function DebtChart({ title, data, integerYAxis = false }: { title: string; data: DebtRow[]; integerYAxis?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="pi" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" allowDecimals={!integerYAxis} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" allowDecimals={!integerYAxis} orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={ttStyle()} />
          <ReferenceLine yAxisId="left" y={0} stroke="#d1d5db" />
          <Bar yAxisId="left" dataKey="debt" name="Defect Debt" maxBarSize={44} radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.debt > 0 ? '#EF4444' : '#22C55E'} fillOpacity={0.85} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="endBugs" name="Bugs fin PI"
            stroke="#c084fc" strokeWidth={1.5} dot={{ r: 3, fill: '#c084fc', strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function DebtOpenClosedChart({
  title,
  data,
  integerYAxis = false,
}: {
  title: string;
  data: DebtOpenClosedRow[];
  integerYAxis?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 0 }} barGap={1} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="pi" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={!integerYAxis} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={ttStyle()} />
          <Bar dataKey="correctedSamePi" stackId="opened" name="Ouverts puis corriges sur ce meme PI" maxBarSize={30} radius={[3, 3, 0, 0]} fill="#5DA7F7" />
          <Bar dataKey="openedRemaining" stackId="opened" name="Ouverts non corriges dans le PI" maxBarSize={30} radius={[3, 3, 0, 0]} fill="#B9D8FF" />
          <Bar dataKey="correctedSamePi" stackId="closed" name="Fermes ouverts sur ce meme PI" maxBarSize={30} radius={[3, 3, 0, 0]} fill="#E783AD" />
          <Bar dataKey="closedFromOutside" stackId="closed" name="Fermes issus d'ouvertures hors PI" maxBarSize={30} radius={[3, 3, 0, 0]} fill="#F8C3D7" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function DefectDebtTab({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<DefectDebtPiRow[]>(DD_RAW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPis, setSelectedPis] = useState<Set<string>>(new Set());
  const [defaultPi, setDefaultPi] = useState<string>('');
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [debtRes, followupRes] = await Promise.all([
          fetch('/api/kpis/defect-debt'),
          fetch('/api/kpis/pi-followup'),
        ]);
        if (!debtRes.ok) throw new Error(`HTTP ${debtRes.status}`);
        const data = await debtRes.json();
        if (!cancelled && Array.isArray(data)) setRows(data);
        if (followupRes.ok) {
          const followupPayload = await followupRes.json();
          if (!cancelled && typeof followupPayload?.defaultPi === 'string') {
            setDefaultPi(followupPayload.defaultPi);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    const available = new Set(rows.map((d) => d.pi));
    setSelectedPis((prev) => {
      if (available.size === 0) return new Set();
      if (!hasInitializedSelection) {
        if (defaultPi && available.has(defaultPi)) {
          setHasInitializedSelection(true);
          return new Set([defaultPi]);
        }
        if (rows.length > 0) {
          setHasInitializedSelection(true);
          return new Set([rows[rows.length - 1].pi]);
        }
        return new Set();
      }
      if (prev.size === 0) return available;
      const next = new Set([...prev].filter((pi) => available.has(pi)));
      return next.size > 0 ? next : available;
    });
  }, [rows, defaultPi, hasInitializedSelection]);

  const filtered = rows.filter((d) => selectedPis.has(d.pi));

  function togglePi(pi: string) {
    setSelectedPis(prev => {
      const next = new Set(prev);
      if (next.has(pi)) { if (next.size > 1) next.delete(pi); }
      else next.add(pi);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {rows.map(({ pi }) => (
          <button key={pi} onClick={() => togglePi(pi)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              selectedPis.has(pi)
                ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >{pi}</button>
        ))}
      </div>
      {loading && <div className="text-xs text-gray-400 mb-3">Chargement des donnees...</div>}
      {error && <div className="text-xs text-red-500 mb-3">Erreur KPI Defect Debt: {error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <DebtChart title="Global"            data={filtered.map(d => ({ pi: d.pi, debt: d.global,    endBugs: d.endGlobal    }))} />
        <DebtChart title="Live (FAH)"        data={filtered.map(d => ({ pi: d.pi, debt: d.live,      endBugs: d.endLive      }))} />
        <DebtChart title="OnPremise (13.8x)" data={filtered.map(d => ({ pi: d.pi, debt: d.onpremise, endBugs: d.endOnpremise }))} />
        <DebtChart title="Hors version"      integerYAxis data={filtered.map(d => ({ pi: d.pi, debt: d.hors,      endBugs: d.endHors      }))} />
      </div>
      <div className="flex items-center gap-5 mt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" /> Dette qui diminue</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Dette qui augmente</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-purple-400" /> Bugs ouverts fin PI</span>
      </div>

      <div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Ouverts vs fermes par PI
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DebtOpenClosedChart
          title="Global"
          data={filtered.map((d) => ({
            pi: d.pi,
            opened: d.openedGlobal,
            closed: d.closedGlobal,
            correctedSamePi: d.correctedSamePiGlobal,
            openedRemaining: Math.max(0, d.openedGlobal - d.correctedSamePiGlobal),
            closedFromOutside: Math.max(0, d.closedGlobal - d.correctedSamePiGlobal),
          }))}
        />
        <DebtOpenClosedChart
          title="Live (FAH)"
          data={filtered.map((d) => ({
            pi: d.pi,
            opened: d.openedLive,
            closed: d.closedLive,
            correctedSamePi: d.correctedSamePiLive,
            openedRemaining: Math.max(0, d.openedLive - d.correctedSamePiLive),
            closedFromOutside: Math.max(0, d.closedLive - d.correctedSamePiLive),
          }))}
        />
        <DebtOpenClosedChart
          title="OnPremise (13.8x)"
          data={filtered.map((d) => ({
            pi: d.pi,
            opened: d.openedOnpremise,
            closed: d.closedOnpremise,
            correctedSamePi: d.correctedSamePiOnpremise,
            openedRemaining: Math.max(0, d.openedOnpremise - d.correctedSamePiOnpremise),
            closedFromOutside: Math.max(0, d.closedOnpremise - d.correctedSamePiOnpremise),
          }))}
        />
        <DebtOpenClosedChart
          title="Hors version"
          integerYAxis
          data={filtered.map((d) => ({
            pi: d.pi,
            opened: d.openedHors,
            closed: d.closedHors,
            correctedSamePi: d.correctedSamePiHors,
            openedRemaining: Math.max(0, d.openedHors - d.correctedSamePiHors),
            closedFromOutside: Math.max(0, d.closedHors - d.correctedSamePiHors),
          }))}
        />
      </div>
      <div className="flex items-center gap-5 mt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#5DA7F7]" /> Ouverts puis corriges sur ce meme PI</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#B9D8FF]" /> Ouverts non corriges dans le PI</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#E783AD]" /> Fermes ouverts sur ce meme PI</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#F8C3D7]" /> Fermes issus d'ouvertures hors PI</span>
      </div>
    </div>
  );
}

// â”€â”€â”€ Tab 2 : Evolution backlog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function BacklogEvoTab({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState(BACKLOG_EVO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(BACKLOG_EVO[0]?.date ?? '2025-04-01');
  const [dateTo, setDateTo] = useState(BACKLOG_EVO[BACKLOG_EVO.length - 1]?.date ?? '2026-03-01');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/kpis/backlog-evolution?months=12&granularity=day');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setRows(data);
          setDateFrom(data[0].date);
          setDateTo(data[data.length - 1].date);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = useMemo(
    () => rows.filter((d) => d.date >= dateFrom && d.date <= dateTo),
    [rows, dateFrom, dateTo],
  );

  const minDate = rows[0]?.date ?? dateFrom;
  const maxDate = rows[rows.length - 1]?.date ?? dateTo;
  const yAxisMax = useMemo(() => {
    const maxValue = filtered.reduce((acc, row) => Math.max(acc, row.total, row.live, row.onpremise, row.hors), 0);
    const target = Math.max(450, maxValue);
    return Math.ceil(target / 25) * 25;
  }, [filtered]);
  const xTickStep = useMemo(() => {
    if (filtered.length > 240) return 28;
    if (filtered.length > 160) return 21;
    if (filtered.length > 100) return 14;
    if (filtered.length > 60) return 7;
    if (filtered.length > 30) return 3;
    return 1;
  }, [filtered.length]);
  const xTickFormatter = (value: string, index: number) => {
    const isLastTick = index === filtered.length - 1;
    if (!isLastTick && index % xTickStep !== 0) return '';
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };
  const tooltipDateFormatter = (value: string) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      {/* Filtres date */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-gray-500">Du</span>
        <input type="date" value={dateFrom} min={minDate} max={dateTo}
          onChange={e => setDateFrom(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#0e1a38] focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <span className="text-sm text-gray-500">au</span>
        <input type="date" value={dateTo} min={dateFrom} max={maxDate}
          onChange={e => setDateTo(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#0e1a38] focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <span className="text-xs text-gray-400 ml-1">{filtered.length} point{filtered.length > 1 ? 's' : ''}</span>
      </div>
      {loading && <div className="text-xs text-gray-400 mb-3">Chargement des donnees...</div>}
      {error && <div className="text-xs text-red-500 mb-3">Erreur KPI Evolution backlog: {error}</div>}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={filtered} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gTotal"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#1E40AF"       stopOpacity={0.15} /><stop offset="95%" stopColor="#1E40AF"       stopOpacity={0} /></linearGradient>
              <linearGradient id="gOnprem" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.onpremise}   stopOpacity={0.3}  /><stop offset="95%" stopColor={C.onpremise}   stopOpacity={0} /></linearGradient>
              <linearGradient id="gLive"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.live}        stopOpacity={0.3}  /><stop offset="95%" stopColor={C.live}        stopOpacity={0} /></linearGradient>
              <linearGradient id="gHors"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.horsVersion} stopOpacity={0.3}  /><stop offset="95%" stopColor={C.horsVersion} stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              interval={0}
              minTickGap={8}
              tickFormatter={xTickFormatter}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, yAxisMax]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={ttStyle()} labelFormatter={(value) => tooltipDateFormatter(String(value))} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Area type="linear" dataKey="total"     name="Total"        stroke="#1E40AF"       strokeWidth={2}   fill="url(#gTotal)"  />
            <Area type="linear" dataKey="onpremise" name="OnPremise"    stroke={C.onpremise}   strokeWidth={1.5} fill="url(#gOnprem)" />
            <Area type="linear" dataKey="live"      name="Live"         stroke={C.live}        strokeWidth={1.5} fill="url(#gLive)"   />
            <Area type="linear" dataKey="hors"      name="Hors version" stroke={C.horsVersion} strokeWidth={1.5} fill="url(#gHors)"   />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// â”€â”€â”€ Tab 3 : Suivi par release â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ClickablePie({
  data, title, selected, onSelect, onClear, compactLegendCount,
}: {
  data: { name: string; value: number; color: string }[];
  title: string;
  selected: string | string[] | null;
  onSelect: (name: string) => void;
  onClear?: () => void;
  compactLegendCount?: number;
}) {
  const [legendExpanded, setLegendExpanded] = useState(false);
  const legendData = useMemo(
    () => data.map((d) => ({ ...d, value: Number(d.value) || 0 })),
    [data],
  );
  const selectedSet = useMemo(() => {
    if (Array.isArray(selected)) return new Set(selected);
    if (typeof selected === 'string' && selected.length > 0) return new Set([selected]);
    return new Set<string>();
  }, [selected]);
  const hasSelection = selectedSet.size > 0;
  const pieData = useMemo(
    () => legendData.filter((d) => (!hasSelection || selectedSet.has(d.name)) && d.value > 0),
    [legendData, hasSelection, selectedSet],
  );
  const firstSelected = useMemo(
    () => legendData.find((d) => selectedSet.has(d.name))?.name ?? null,
    [legendData, selectedSet],
  );
  const total = pieData.reduce((s, d) => s + d.value, 0);
  const legendTotal = legendData.reduce((s, d) => s + d.value, 0);
  const maxLegendItems = compactLegendCount && compactLegendCount > 0 ? compactLegendCount : legendData.length;
  const shouldCollapseLegend = legendData.length > maxLegendItems;

  useEffect(() => {
    setLegendExpanded(false);
  }, [legendData.length, title]);

  const visibleLegendData = useMemo(() => {
    if (!shouldCollapseLegend || legendExpanded) return legendData;
    const head = legendData.slice(0, maxLegendItems);
    if (!firstSelected || head.some((d) => d.name === firstSelected)) return head;
    const selectedEntry = legendData.find((d) => d.name === firstSelected);
    if (!selectedEntry) return head;
    return [
      selectedEntry,
      ...legendData.filter((d) => d.name !== firstSelected).slice(0, Math.max(0, maxLegendItems - 1)),
    ];
  }, [shouldCollapseLegend, legendExpanded, legendData, maxLegendItems, firstSelected]);

  return (
    <div className="flex-1 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="relative lg:w-[46%] lg:min-w-[220px]">
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={188}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={76}
                  dataKey="value"
                  isAnimationActive
                  animationDuration={260}
                  animationEasing="ease-out"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                    onClick={(entry) => { if (entry?.name) onSelect(entry.name as string); }}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={ttStyle()} formatter={(v) => [String(v) + ' bugs']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-mono font-bold text-[#0e1a38]">{total}</span>
              </div>
            </>
          ) : (
            <div className="h-[188px] flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
              Aucune donnée active
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            {visibleLegendData.map(d => {
              const disabled = hasSelection && !selectedSet.has(d.name);
              return (
                <button
                  key={d.name}
                  onClick={() => onSelect(d.name)}
                  className={[
                    'w-full flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded transition-colors',
                    disabled ? 'opacity-60 hover:bg-gray-50' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className={['truncate', disabled ? 'text-gray-400 line-through' : 'text-gray-600'].join(' ')}>
                      {d.name}
                    </span>
                  </span>
                  <span className={['font-mono shrink-0', disabled ? 'text-gray-400 line-through' : 'text-gray-600'].join(' ')}>
                    {d.value} <span className="text-gray-400">({legendTotal > 0 ? Math.round((d.value / legendTotal) * 100) : 0}%)</span>
                  </span>
                </button>
              );
            })}
          </div>

          {shouldCollapseLegend && (
            <button
              type="button"
              onClick={() => setLegendExpanded((prev) => !prev)}
              className="w-full text-[11px] text-gray-500 hover:text-gray-700 text-center pt-1"
            >
              {legendExpanded ? 'Voir moins' : `Voir plus (${legendData.length - visibleLegendData.length})`}
            </button>
          )}

          {selectedSet.size > 0 && (
            <button
              onClick={() => {
                if (onClear) onClear();
                else if (firstSelected) onSelect(firstSelected);
              }}
              className="mt-2 w-full text-[11px] text-blue-500 hover:text-blue-700 text-center"
            >
              Réinitialiser le filtre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuiviReleaseTab({ refreshKey }: { refreshKey: number }) {
  const persisted = useMemo(() => loadPersistedReleaseFilters(), []);

  const [allBugs, setAllBugs] = useState<ReleaseBug[]>([]);
  const [products, setProducts] = useState<Array<{ value: ReleaseProduct; label: string }>>([
    { value: 'live', label: 'Live' },
    { value: 'onpremise', label: 'On prem' },
    { value: 'hors_version', label: 'Hors version' },
  ]);
  const [configuredMajorVersions, setConfiguredMajorVersions] = useState<string[]>([]);
  const [alwaysVisibleVersions, setAlwaysVisibleVersions] = useState<string[]>(['vide', 'Non concerne']);

  const [selectedProducts, setSelectedProducts] = useState<ReleaseProduct[]>(persisted.products);
  const [selectedVersions, setSelectedVersions] = useState<string[]>(persisted.versions);
  const [selectedPatches, setSelectedPatches] = useState<string[]>(persisted.patches);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [releaseRes, settingsRes] = await Promise.all([
          fetch('/api/kpis/point-backlog'),
          fetch('/api/settings/release-versions'),
        ]);
        if (!releaseRes.ok) throw new Error(`HTTP ${releaseRes.status}`);
        if (!settingsRes.ok) throw new Error(`HTTP ${settingsRes.status}`);

        const releasePayload = await releaseRes.json() as PointBacklogResponse;
        const settingsPayload = await settingsRes.json() as ReleaseVersionSettingsResponse;

        if (cancelled) return;

        if (Array.isArray(releasePayload.products) && releasePayload.products.length > 0) {
          setProducts(releasePayload.products.filter((p) => p.value !== 'uncategorized'));
        }
        setAllBugs(Array.isArray(releasePayload.bugs) ? releasePayload.bugs : []);
        setConfiguredMajorVersions(
          Array.isArray(settingsPayload.versions)
            ? settingsPayload.versions.filter((v) => v.selected).map((v) => v.version)
            : [],
        );
        setAlwaysVisibleVersions(
          Array.isArray(settingsPayload.alwaysVisible) ? settingsPayload.alwaysVisible : ['vide', 'Non concerne'],
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const releaseFilteredByProduct = useMemo(() => {
    if (selectedProducts.length === 0) return allBugs;
    const selected = new Set(selectedProducts);
    return allBugs.filter((bug) => selected.has(bug.product));
  }, [allBugs, selectedProducts]);

  const versionOptions = useMemo(() => {
    const configuredSet = new Set(configuredMajorVersions);
    const alwaysVisibleSet = new Set(alwaysVisibleVersions);
    const source = releaseFilteredByProduct;
    const selectedProductSet = new Set(selectedProducts);

    const values = new Set<string>();
    for (const bug of source) {
      const major = bug.majorVersion;
      const allowedByProduct = selectedProductSet.size === 0
        || [...selectedProductSet].some((p) => majorVersionMatchesProduct(major, p));
      if (alwaysVisibleSet.has(major) || (configuredSet.has(major) && allowedByProduct)) {
        values.add(bug.majorVersion);
      }
    }
    for (const alwaysVisible of alwaysVisibleVersions) values.add(alwaysVisible);

    const ordered = [...values].sort((a, b) => {
      if (a === 'vide') return 1;
      if (b === 'vide') return -1;
      if (a === 'Non concerne') return 1;
      if (b === 'Non concerne') return -1;
      return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
    });
    return ordered;
  }, [releaseFilteredByProduct, configuredMajorVersions, alwaysVisibleVersions, selectedProducts]);

  const effectiveVersionSet = useMemo(
    () => new Set(selectedVersions.length > 0 ? selectedVersions : versionOptions),
    [selectedVersions, versionOptions],
  );

  const patchOptions = useMemo(() => {
    const source = releaseFilteredByProduct.filter((bug) => effectiveVersionSet.has(bug.majorVersion));
    return [...new Set(source.map((bug) => bug.patch).filter((p): p is string => Boolean(p)))]
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
  }, [releaseFilteredByProduct, effectiveVersionSet]);

  useEffect(() => {
    setSelectedProducts((prev) => prev.filter((p) => products.some((opt) => opt.value === p)));
  }, [products]);

  useEffect(() => {
    setSelectedVersions((prev) => prev.filter((v) => versionOptions.includes(v)));
  }, [versionOptions]);

  useEffect(() => {
    setSelectedPatches((prev) => prev.filter((v) => patchOptions.includes(v)));
  }, [patchOptions]);

  const releaseFilteredBugs = useMemo(() => {
    const productSet = new Set(selectedProducts);
    const patchSet = new Set(selectedPatches);
    return allBugs.filter((bug) => (
      (productSet.size === 0 || productSet.has(bug.product)) &&
      effectiveVersionSet.has(bug.majorVersion) &&
      (patchSet.size === 0 || (bug.patch !== null && patchSet.has(bug.patch)))
    ));
  }, [allBugs, selectedProducts, selectedPatches, effectiveVersionSet]);

  const statePalette: Record<string, string> = {
    New: '#1D4ED8',
    Active: '#D97706',
    Resolved: '#7C3AED',
    Closed: '#6B7280',
  };
  const teamPalette: Record<string, string> = {
    ...C.teams,
    'A corriger': '#9CA3AF',
    'Non affecte': '#9CA3AF',
  };

  const stateLegendOptions = useMemo(() => {
    const stateSet = new Set(releaseFilteredBugs.map((b) => b.state));
    const ordered: string[] = [...DEFAULT_RELEASE_STATES];
    const extras = [...stateSet].filter((name) => !ordered.includes(name)).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    return [...ordered, ...extras];
  }, [releaseFilteredBugs]);

  const teamLegendOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bug of releaseFilteredBugs) counts.set(bug.team, (counts.get(bug.team) ?? 0) + 1);
    return [...counts.keys()].sort((a, b) => (
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b, 'fr', { sensitivity: 'base' })
    ));
  }, [releaseFilteredBugs]);

  useEffect(() => {
    setSelectedStates((prev) => {
      const next = prev.filter((stateName) => stateLegendOptions.includes(stateName));
      return next.length > 0 ? next : [...stateLegendOptions];
    });
  }, [stateLegendOptions]);

  useEffect(() => {
    setSelectedTeams((prev) => {
      const next = prev.filter((teamName) => teamLegendOptions.includes(teamName));
      return next.length > 0 ? next : [...teamLegendOptions];
    });
  }, [teamLegendOptions]);

  const stateSelectionSet = useMemo(() => new Set(selectedStates), [selectedStates]);
  const teamSelectionSet = useMemo(() => new Set(selectedTeams), [selectedTeams]);

  const filteredBugs = useMemo(
    () => releaseFilteredBugs.filter((b) => stateSelectionSet.has(b.state) && teamSelectionSet.has(b.team)),
    [releaseFilteredBugs, stateSelectionSet, teamSelectionSet],
  );

  const statePieData = useMemo(() => {
    const source = releaseFilteredBugs.filter((b) => teamSelectionSet.has(b.team));
    const counts = new Map<string, number>();
    for (const bug of source) counts.set(bug.state, (counts.get(bug.state) ?? 0) + 1);

    return stateLegendOptions
      .map((name) => ({ name, value: counts.get(name) ?? 0, color: statePalette[name] ?? '#9CA3AF' }));
  }, [releaseFilteredBugs, teamSelectionSet, stateLegendOptions]);

  const teamPieData = useMemo(() => {
    const source = releaseFilteredBugs.filter((b) => stateSelectionSet.has(b.state));
    const counts = new Map<string, number>();
    for (const bug of source) counts.set(bug.team, (counts.get(bug.team) ?? 0) + 1);

    return teamLegendOptions.map((name) => ({ name, value: counts.get(name) ?? 0, color: teamPalette[name] ?? '#9CA3AF' }));
  }, [releaseFilteredBugs, stateSelectionSet, teamLegendOptions]);

  function toggleState(name: string) {
    setSelectedStates((prev) => (
      prev.includes(name) ? prev.filter((stateName) => stateName !== name) : [...prev, name]
    ));
  }

  function toggleTeam(name: string) {
    setSelectedTeams((prev) => (
      prev.includes(name) ? prev.filter((teamName) => teamName !== name) : [...prev, name]
    ));
  }

  function toggleBugFilter(bug: ReleaseBug) {
    if (selectedStates.length === 1 && selectedStates[0] === bug.state && selectedTeams.length === 1 && selectedTeams[0] === bug.team) {
      setSelectedStates([...DEFAULT_RELEASE_STATES]);
      setSelectedTeams([...teamLegendOptions]);
      return;
    }
    setSelectedStates([bug.state]);
    setSelectedTeams([bug.team]);
  }

  const hasReleaseFilter = selectedProducts.length > 0 || selectedVersions.length > 0 || selectedPatches.length > 0;
  const stateFilterIsDefault =
    selectedStates.length === stateLegendOptions.length
    && stateLegendOptions.every((stateName) => selectedStates.includes(stateName));
  const teamFilterIsDefault =
    selectedTeams.length === teamLegendOptions.length
    && teamLegendOptions.every((teamName) => selectedTeams.includes(teamName));
  const hasFilter = hasReleaseFilter || !stateFilterIsDefault || !teamFilterIsDefault;
  const productLabelByValue = useMemo(
    () => new Map(products.map((p) => [p.value, p.label] as const)),
    [products],
  );

  useEffect(() => {
    savePersistedReleaseFilters({
      products: selectedProducts,
      versions: selectedVersions,
      patches: selectedPatches,
    });
  }, [selectedProducts, selectedVersions, selectedPatches]);

  return (
    <div>
      <div className="mb-5 bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <MultiSelect
            label="Produit"
            options={products.map((p) => p.value)}
            selected={selectedProducts}
            onChange={(next) => setSelectedProducts(next.filter((v): v is ReleaseProduct => products.some((p) => p.value === v) && v !== 'uncategorized'))}
            renderOption={(value) => productLabelByValue.get(value as ReleaseProduct) ?? value}
          />
          <MultiSelect
            label="Version"
            options={versionOptions}
            selected={selectedVersions}
            onChange={setSelectedVersions}
          />
          <MultiSelect
            label="Patch"
            options={patchOptions}
            selected={selectedPatches}
            onChange={setSelectedPatches}
          />

          <div className="ml-auto flex items-center gap-2">
            {hasFilter && (
              <button
                onClick={() => {
                  setSelectedProducts([]);
                  setSelectedVersions([]);
                  setSelectedPatches([]);
                  setSelectedStates([...DEFAULT_RELEASE_STATES]);
                  setSelectedTeams([...teamLegendOptions]);
                }}
                className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded-full px-2.5 py-1"
              >
                Réinitialiser tous les filtres
              </button>
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {filteredBugs.length} / {releaseFilteredBugs.length} bug{releaseFilteredBugs.length > 1 ? 's' : ''}
              {hasFilter ? ' (filtres)' : ''}
            </span>
          </div>
        </div>

        {hasFilter && (
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedProducts.map((p) => (
              <button
                key={`product-${p}`}
                type="button"
                onClick={() => setSelectedProducts((prev) => prev.filter((v) => v !== p))}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700 hover:border-blue-300"
                title="Supprimer ce filtre produit"
              >
                <span>{`Produit: ${productLabelByValue.get(p) ?? p}`}</span>
                <span className="leading-none">×</span>
              </button>
            ))}
            {selectedVersions.map((v) => (
              <button
                key={`version-${v}`}
                type="button"
                onClick={() => setSelectedVersions((prev) => prev.filter((x) => x !== v))}
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-700 hover:border-indigo-300"
                title="Supprimer ce filtre version"
              >
                <span>{`Version: ${v}`}</span>
                <span className="leading-none">×</span>
              </button>
            ))}
            {selectedPatches.map((p) => (
              <button
                key={`patch-${p}`}
                type="button"
                onClick={() => setSelectedPatches((prev) => prev.filter((x) => x !== p))}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 hover:border-emerald-300"
                title="Supprimer ce filtre patch"
              >
                <span>{`Patch: ${p}`}</span>
                <span className="leading-none">×</span>
              </button>
            ))}
          </div>
        )}

      </div>

      {loading && <div className="text-xs text-gray-400 mb-3">Chargement des données...</div>}
      {error && <div className="text-xs text-red-500 mb-3">Erreur KPI Point backlog: {error}</div>}

      <div className="flex gap-4 mb-5">
        <ClickablePie
          data={statePieData}
          title="Par état - cliquer pour filtrer"
          selected={selectedStates}
          onSelect={toggleState}
          onClear={() => setSelectedStates([...DEFAULT_RELEASE_STATES])}
        />
        <ClickablePie
          data={teamPieData}
          title="Par équipe - cliquer pour filtrer"
          selected={selectedTeams}
          onSelect={toggleTeam}
          onClear={() => setSelectedTeams([...teamLegendOptions])}
          compactLegendCount={5}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-16">ID</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-[38%]">Titre</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-36">Version souhaitée</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-24">État</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-32">Équipe</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-28">Sprint</th>
            </tr>
          </thead>
          <tbody>
            {filteredBugs.map((bug) => {
              const rowActive = selectedStates.length === 1 && selectedStates[0] === bug.state && selectedTeams.length === 1 && selectedTeams[0] === bug.team;
              return (
                <tr
                  key={bug.id}
                  onClick={() => toggleBugFilter(bug)}
                  className={[
                    'border-b border-gray-50 transition-colors cursor-pointer',
                    rowActive ? 'bg-blue-50' : 'hover:bg-blue-50/40',
                  ].join(' ')}
                  title="Cliquer pour filtrer sur cet état + cette équipe"
                >
                  <td className="px-4 py-2 font-mono text-gray-400">{bug.id}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-0" style={{ maxWidth: 320 }}>
                    <span
                      title={bug.title}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        whiteSpace: 'normal',
                        lineHeight: '1.25rem',
                        maxHeight: '2.5rem',
                      }}
                    >
                      {bug.title}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 font-mono">
                    {(bug.version && bug.version.trim().length > 0) ? bug.version : 'vide'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={[
                      'inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border',
                      STATE_BADGE[bug.state] ?? 'bg-gray-50 text-gray-500',
                    ].join(' ')}>
                      {bug.state}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{bug.team}</td>
                  <td className="px-4 py-2 font-mono text-gray-400 text-[10px]">{bug.sprint}</td>
                </tr>
              );
            })}
            {filteredBugs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">Aucun bug pour ces filtres</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuiviPiTab({ refreshKey }: { refreshKey: number }) {
  const persisted = useMemo(() => loadPersistedPiFollowupFilters(), []);

  const [allBugs, setAllBugs] = useState<PiFollowupBug[]>([]);
  const [piWindows, setPiWindows] = useState<PiFollowupWindow[]>([]);
  const [defaultPi, setDefaultPi] = useState('');
  const [configuredMajorVersions, setConfiguredMajorVersions] = useState<string[]>([]);
  const [alwaysVisibleVersions, setAlwaysVisibleVersions] = useState<string[]>(['vide', 'Non concerne']);

  const [selectedPi, setSelectedPi] = useState<string>(persisted.piLabel ?? '');
  const [selectedEvents, setSelectedEvents] = useState<PiEventKey[]>(persisted.events);
  const [selectedProducts, setSelectedProducts] = useState<ReleaseProduct[]>(persisted.products);
  const [selectedVersions, setSelectedVersions] = useState<string[]>(persisted.versions);
  const [selectedPatches, setSelectedPatches] = useState<string[]>(persisted.patches);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backlogSeries, setBacklogSeries] = useState<BacklogEvolutionPoint[]>([]);
  const [backlogExcerptLoading, setBacklogExcerptLoading] = useState(true);
  const [backlogExcerptError, setBacklogExcerptError] = useState<string | null>(null);

  const productOptions = useMemo<Array<{ value: ReleaseProduct; label: string }>>(() => ([
    { value: 'live', label: 'Live' },
    { value: 'onpremise', label: 'On prem' },
    { value: 'hors_version', label: 'Hors version' },
    { value: 'uncategorized', label: 'Non classé' },
  ]), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [followupRes, settingsRes] = await Promise.all([
          fetch('/api/kpis/pi-followup'),
          fetch('/api/settings/release-versions'),
        ]);
        if (!followupRes.ok) throw new Error(`HTTP ${followupRes.status}`);
        if (!settingsRes.ok) throw new Error(`HTTP ${settingsRes.status}`);

        const followupPayload = await followupRes.json() as PiFollowupResponse;
        const settingsPayload = await settingsRes.json() as ReleaseVersionSettingsResponse;
        if (cancelled) return;

        const windows = Array.isArray(followupPayload.piWindows) ? followupPayload.piWindows : [];
        setPiWindows(windows);
        setAllBugs(Array.isArray(followupPayload.bugs) ? followupPayload.bugs : []);
        setDefaultPi(typeof followupPayload.defaultPi === 'string' ? followupPayload.defaultPi : '');
        setConfiguredMajorVersions(
          Array.isArray(settingsPayload.versions)
            ? settingsPayload.versions.filter((v) => v.selected).map((v) => v.version)
            : [],
        );
        setAlwaysVisibleVersions(
          Array.isArray(settingsPayload.alwaysVisible) ? settingsPayload.alwaysVisible : ['vide', 'Non concerne'],
        );

        const available = new Set(windows.map((w) => w.label));
        setSelectedPi((prev) => {
          if (prev && available.has(prev)) return prev;
          if (persisted.piLabel && available.has(persisted.piLabel)) return persisted.piLabel;
          if (followupPayload.defaultPi && available.has(followupPayload.defaultPi)) return followupPayload.defaultPi;
          return windows[0]?.label ?? '';
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey, persisted.piLabel]);

  const piLabels = useMemo(() => piWindows.map((window) => window.label), [piWindows]);

  useEffect(() => {
    setSelectedPi((prev) => {
      if (prev && piLabels.includes(prev)) return prev;
      if (defaultPi && piLabels.includes(defaultPi)) return defaultPi;
      return piLabels[0] ?? '';
    });
  }, [defaultPi, piLabels]);

  useEffect(() => {
    let cancelled = false;
    async function loadBacklogEvolution() {
      setBacklogExcerptLoading(true);
      setBacklogExcerptError(null);
      try {
        const res = await fetch('/api/kpis/backlog-evolution?months=120&granularity=day');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (cancelled) return;
        if (Array.isArray(payload)) {
          const normalized = payload
            .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
            .filter((row) => typeof row.date === 'string')
            .map((row) => ({
              date: String(row.date),
              label: typeof row.label === 'string' ? row.label : undefined,
              total: Number(row.total) || 0,
              live: Number(row.live) || 0,
              onpremise: Number(row.onpremise) || 0,
              hors: Number(row.hors) || 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
          setBacklogSeries(normalized);
        } else {
          setBacklogSeries([]);
        }
      } catch (e) {
        if (!cancelled) {
          setBacklogSeries([]);
          setBacklogExcerptError(e instanceof Error ? e.message : 'Erreur inconnue');
        }
      } finally {
        if (!cancelled) setBacklogExcerptLoading(false);
      }
    }
    loadBacklogEvolution();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const hasPiEvent = (bug: PiFollowupBug, event: PiEventKey, piLabel: string): boolean => {
    if (event === 'created') return bug.createdPi === piLabel;
    return bug.closedPi === piLabel;
  };

  const piEventFilteredBugs = useMemo(() => {
    if (!selectedPi || selectedEvents.length === 0) return [];
    return allBugs.filter((bug) => selectedEvents.some((event) => hasPiEvent(bug, event, selectedPi)));
  }, [allBugs, selectedPi, selectedEvents]);

  const releaseFilteredByProduct = useMemo(() => {
    if (selectedProducts.length === 0) return piEventFilteredBugs;
    const selected = new Set(selectedProducts);
    return piEventFilteredBugs.filter((bug) => selected.has(bug.product));
  }, [piEventFilteredBugs, selectedProducts]);

  const versionOptions = useMemo(() => {
    const configuredSet = new Set(configuredMajorVersions);
    const alwaysVisibleSet = new Set(alwaysVisibleVersions);
    const selectedProductSet = new Set(selectedProducts);
    const values = new Set<string>();

    for (const bug of releaseFilteredByProduct) {
      const major = bug.majorVersion;
      const allowedByProduct = selectedProductSet.size === 0
        || [...selectedProductSet].some((p) => majorVersionMatchesProduct(major, p));
      if (alwaysVisibleSet.has(major) || (configuredSet.has(major) && allowedByProduct)) {
        values.add(major);
      }
    }
    for (const alwaysVisible of alwaysVisibleVersions) values.add(alwaysVisible);

    return [...values].sort((a, b) => {
      if (a === 'vide') return 1;
      if (b === 'vide') return -1;
      if (a === 'Non concerne') return 1;
      if (b === 'Non concerne') return -1;
      return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
    });
  }, [releaseFilteredByProduct, configuredMajorVersions, alwaysVisibleVersions, selectedProducts]);

  const effectiveVersionSet = useMemo(
    () => new Set(selectedVersions.length > 0 ? selectedVersions : versionOptions),
    [selectedVersions, versionOptions],
  );

  const patchOptions = useMemo(() => {
    const source = releaseFilteredByProduct.filter((bug) => effectiveVersionSet.has(bug.majorVersion));
    return [...new Set(source.map((bug) => bug.patch).filter((patch): patch is string => Boolean(patch)))]
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
  }, [releaseFilteredByProduct, effectiveVersionSet]);

  useEffect(() => {
    setSelectedProducts((prev) => prev.filter((p) => productOptions.some((opt) => opt.value === p)));
  }, [productOptions]);

  useEffect(() => {
    setSelectedVersions((prev) => prev.filter((version) => versionOptions.includes(version)));
  }, [versionOptions]);

  useEffect(() => {
    setSelectedPatches((prev) => prev.filter((patch) => patchOptions.includes(patch)));
  }, [patchOptions]);

  const filteredBugs = useMemo(() => {
    const productSet = new Set(selectedProducts);
    const patchSet = new Set(selectedPatches);
    return piEventFilteredBugs.filter((bug) => (
      (productSet.size === 0 || productSet.has(bug.product))
      && effectiveVersionSet.has(bug.majorVersion)
      && (patchSet.size === 0 || (bug.patch !== null && patchSet.has(bug.patch)))
    ));
  }, [piEventFilteredBugs, selectedProducts, selectedPatches, effectiveVersionSet]);

  const eventCounts = useMemo(() => {
    const selectedEventSet = new Set(selectedEvents);
    const count = { created: 0, closed: 0 };
    for (const bug of filteredBugs) {
      if (selectedEventSet.has('created') && bug.createdPi === selectedPi) count.created += 1;
      if (selectedEventSet.has('closed') && bug.closedPi === selectedPi) count.closed += 1;
    }
    return count;
  }, [filteredBugs, selectedEvents, selectedPi]);

  const eventChartData = useMemo(
    () => PI_EVENTS.map((event) => ({
      event,
      label: PI_EVENT_LABEL[event],
      value: eventCounts[event],
    })),
    [eventCounts],
  );

  const productGraphOrder: ReleaseProduct[] = ['live', 'onpremise', 'hors_version'];

  const productLabels: Record<ReleaseProduct, string> = {
    live: 'Live',
    onpremise: 'On prem',
    hors_version: 'Hors version',
    uncategorized: 'Non classé',
  };

  const productBreakdown = useMemo(() => {
    return productGraphOrder.map((product) => {
      const row = {
        product,
        label: productLabels[product],
        created: 0,
        closed: 0,
      };
      for (const bug of filteredBugs) {
        if (bug.product !== product) continue;
        if (selectedEvents.includes('created') && bug.createdPi === selectedPi) row.created += 1;
        if (selectedEvents.includes('closed') && bug.closedPi === selectedPi) row.closed += 1;
      }
      return row;
    });
  }, [filteredBugs, selectedEvents, selectedPi]);

  const sortedPiWindows = useMemo(
    () => [...piWindows].sort((a, b) => a.start.localeCompare(b.start) || a.label.localeCompare(b.label, 'fr', { numeric: true, sensitivity: 'base' })),
    [piWindows],
  );

  const selectedWindow = useMemo(
    () => sortedPiWindows.find((window) => window.label === selectedPi) ?? null,
    [sortedPiWindows, selectedPi],
  );

  const selectedExercise = useMemo(() => {
    const match = selectedPi.match(/^(\d{2}-\d{2})\s+PI\d+$/i);
    return match?.[1] ?? null;
  }, [selectedPi]);

  const referenceMs = useMemo(() => {
    if (!selectedWindow) return null;
    if (selectedWindow.completed) {
      const endMs = Date.parse(`${selectedWindow.end}T23:59:59.999Z`);
      return Number.isNaN(endMs) ? null : endMs;
    }
    return Date.now();
  }, [selectedWindow]);

  const exerciseStartMs = useMemo(() => {
    if (!selectedExercise) return null;
    const exerciseWindows = sortedPiWindows.filter((window) => window.label.startsWith(`${selectedExercise} `));
    if (exerciseWindows.length === 0) return null;
    const startMs = Date.parse(`${exerciseWindows[0].start}T00:00:00.000Z`);
    return Number.isNaN(startMs) ? null : startMs;
  }, [selectedExercise, sortedPiWindows]);

  const previousPiEndMs = useMemo(() => {
    if (!selectedWindow) return null;
    const scopeWindows = selectedExercise
      ? sortedPiWindows.filter((window) => window.label.startsWith(`${selectedExercise} `))
      : sortedPiWindows;
    const idx = scopeWindows.findIndex((window) => window.label === selectedWindow.label);
    if (idx <= 0) return null;
    const prev = scopeWindows[idx - 1];
    const endMs = Date.parse(`${prev.end}T23:59:59.999Z`);
    return Number.isNaN(endMs) ? null : endMs;
  }, [sortedPiWindows, selectedWindow, selectedExercise]);

  const backlogDelta = useMemo(() => {
    function countAt(atMs: number, scope: 'total' | 'onpremise' | 'live'): number {
      let count = 0;
      for (const bug of allBugs) {
        if (scope === 'onpremise' && bug.product !== 'onpremise') continue;
        if (scope === 'live' && bug.product !== 'live') continue;

        const createdMs = bug.createdDate ? Date.parse(bug.createdDate) : Number.NaN;
        if (Number.isNaN(createdMs) || createdMs > atMs) continue;

        const closeSource = bug.closedDate ?? bug.resolvedDate;
        const closeMs = closeSource ? Date.parse(closeSource) : Number.NaN;
        const isClosed = !Number.isNaN(closeMs) && closeMs <= atMs;
        if (isClosed) continue;
        count += 1;
      }
      return count;
    }

    function delta(baseMs: number | null, scope: 'total' | 'onpremise' | 'live'): number | null {
      if (referenceMs === null || baseMs === null) return null;
      return countAt(referenceMs, scope) - countAt(baseMs, scope);
    }

    return {
      exercise: {
        total: delta(exerciseStartMs, 'total'),
        onpremise: delta(exerciseStartMs, 'onpremise'),
        live: delta(exerciseStartMs, 'live'),
      },
      previousPi: {
        total: delta(previousPiEndMs, 'total'),
        onpremise: delta(previousPiEndMs, 'onpremise'),
        live: delta(previousPiEndMs, 'live'),
      },
    };
  }, [allBugs, referenceMs, exerciseStartMs, previousPiEndMs]);

  const exerciseStartDate = useMemo(() => {
    if (!selectedExercise) return null;
    const exerciseWindows = sortedPiWindows.filter((window) => window.label.startsWith(`${selectedExercise} `));
    return exerciseWindows[0]?.start ?? null;
  }, [selectedExercise, sortedPiWindows]);

  const todayDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedPi]);

  const exerciseBacklogExcerptRows = useMemo(() => {
    if (!exerciseStartDate) return [];
    return backlogSeries.filter((row) => row.date >= exerciseStartDate && row.date <= todayDate);
  }, [backlogSeries, exerciseStartDate, todayDate]);

  const excerptYAxisMax = useMemo(() => {
    const maxValue = exerciseBacklogExcerptRows.reduce(
      (acc, row) => Math.max(acc, row.total, row.live, row.onpremise, row.hors),
      0,
    );
    const target = Math.max(450, maxValue);
    return Math.ceil(target / 25) * 25;
  }, [exerciseBacklogExcerptRows]);

  const excerptTickStep = useMemo(() => {
    if (exerciseBacklogExcerptRows.length > 240) return 28;
    if (exerciseBacklogExcerptRows.length > 160) return 21;
    if (exerciseBacklogExcerptRows.length > 100) return 14;
    if (exerciseBacklogExcerptRows.length > 60) return 7;
    if (exerciseBacklogExcerptRows.length > 30) return 3;
    return 1;
  }, [exerciseBacklogExcerptRows.length]);

  const excerptTickFormatter = (value: string, index: number) => {
    const isLastTick = index === exerciseBacklogExcerptRows.length - 1;
    if (!isLastTick && index % excerptTickStep !== 0) return '';
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const excerptTooltipDateFormatter = (value: string) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const hasReleaseFilter = selectedProducts.length > 0 || selectedVersions.length > 0 || selectedPatches.length > 0;
  const hasEventFilter = selectedEvents.length !== PI_EVENTS.length;
  const hasPiFilter = defaultPi ? selectedPi !== defaultPi : false;
  const hasFilter = hasReleaseFilter || hasEventFilter || hasPiFilter;

  useEffect(() => {
    savePersistedPiFollowupFilters({
      piLabel: selectedPi || null,
      events: selectedEvents,
      products: selectedProducts,
      versions: selectedVersions,
      patches: selectedPatches,
    });
  }, [selectedPi, selectedEvents, selectedProducts, selectedVersions, selectedPatches]);

  const formatShortDate = (value: string | null): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
  };

  function DeltaValue({ value }: { value: number | null }) {
    if (value === null) {
      return (
        <div className="mt-2 flex items-center gap-2 text-gray-400">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300">
            <span className="block h-[2px] w-2 rounded bg-gray-400" />
          </span>
          <span className="font-mono text-sm">N/A</span>
        </div>
      );
    }

    if (value > 0) {
      return (
        <div className="mt-2 flex items-center gap-2 text-red-600">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 13V3" />
            <path d="M4 7l4-4 4 4" />
          </svg>
          <span className="font-mono text-sm">{value > 0 ? `+${value}` : value}</span>
        </div>
      );
    }

    if (value < 0) {
      return (
        <div className="mt-2 flex items-center gap-2 text-emerald-600">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10" />
            <path d="M4 9l4 4 4-4" />
          </svg>
          <span className="font-mono text-sm">{value}</span>
        </div>
      );
    }

    return (
      <div className="mt-2 flex items-center gap-2 text-gray-500">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300">
          <span className="block h-[2px] w-2 rounded bg-gray-500" />
        </span>
        <span className="font-mono text-sm">0</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-[220px]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">PI</div>
            <select
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#66D2DB]/40"
              value={selectedPi}
              onChange={(e) => setSelectedPi(e.target.value)}
            >
              {piWindows.map((window) => (
                <option key={window.label} value={window.label}>
                  {window.label}
                </option>
              ))}
            </select>
          </div>

          <MultiSelect
            label="Évènement"
            options={PI_EVENTS}
            selected={selectedEvents}
            onChange={(next) => setSelectedEvents(next.filter((value): value is PiEventKey => PI_EVENTS.includes(value as PiEventKey)))}
            renderOption={(value) => PI_EVENT_LABEL[value as PiEventKey] ?? value}
          />
          <MultiSelect
            label="Produit"
            options={productOptions.map((option) => option.value)}
            selected={selectedProducts}
            onChange={(next) => setSelectedProducts(next.filter((value): value is ReleaseProduct => productOptions.some((option) => option.value === value)))}
            renderOption={(value) => productLabels[value as ReleaseProduct] ?? value}
          />
          <MultiSelect label="Version" options={versionOptions} selected={selectedVersions} onChange={setSelectedVersions} />
          <MultiSelect label="Patch" options={patchOptions} selected={selectedPatches} onChange={setSelectedPatches} />

          <div className="ml-auto flex items-center gap-2">
            {hasFilter && (
              <button
                onClick={() => {
                  setSelectedPi(defaultPi || piWindows[0]?.label || '');
                  setSelectedEvents([...PI_EVENTS]);
                  setSelectedProducts([]);
                  setSelectedVersions([]);
                  setSelectedPatches([]);
                }}
                className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded-full px-2.5 py-1"
              >
                Réinitialiser tous les filtres
              </button>
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {filteredBugs.length} / {piEventFilteredBugs.length} bug{piEventFilteredBugs.length > 1 ? 's' : ''}
              {hasFilter ? ' (filtres)' : ''}
            </span>
          </div>
        </div>
      </div>

      {loading && <div className="text-xs text-gray-400 mb-3">Chargement des données...</div>}
      {error && <div className="text-xs text-red-500 mb-3">Erreur KPI Suivi par PI: {error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 mb-5">
        {PI_EVENTS.map((event) => (
          <div key={event} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 xl:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{PI_EVENT_LABEL[event]}</div>
            <div className="mt-2 text-3xl font-semibold text-[#0e1a38]">{eventCounts[event]}</div>
            <div className="mt-1 text-[11px] text-gray-400">{selectedPi || 'Aucun PI'}</div>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 xl:col-span-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Tendance backlog vs début d'exercice</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="text-[11px] text-gray-500">Total</div>
              <DeltaValue value={backlogDelta.exercise.total} />
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="text-[11px] text-gray-500">OnPrem</div>
              <DeltaValue value={backlogDelta.exercise.onpremise} />
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="text-[11px] text-gray-500">Live</div>
              <DeltaValue value={backlogDelta.exercise.live} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 xl:col-span-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Tendance backlog vs dernier PI</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="text-[11px] text-gray-500">Total</div>
              <DeltaValue value={backlogDelta.previousPi.total} />
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="text-[11px] text-gray-500">OnPrem</div>
              <DeltaValue value={backlogDelta.previousPi.onpremise} />
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="text-[11px] text-gray-500">Live</div>
              <DeltaValue value={backlogDelta.previousPi.live} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 xl:col-span-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Évènements du PI</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={eventChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={ttStyle()} />
              <Bar dataKey="value" name="Bugs" maxBarSize={52} radius={[3, 3, 0, 0]}>
                {eventChartData.map((entry) => (
                  <Cell key={entry.event} fill={PI_EVENT_BAR_COLORS[entry.event]} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 xl:col-span-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Répartition par produit</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={productBreakdown} barGap={2} barCategoryGap="24%" margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={ttStyle()} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="created" name="Créés" fill={PI_EVENT_BAR_COLORS.created} maxBarSize={24} radius={[2, 2, 0, 0]} />
              <Bar dataKey="closed" name="Fermés" fill={PI_EVENT_BAR_COLORS.closed} maxBarSize={24} radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 xl:col-span-6 md:col-span-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Extrait Evolution backlog</div>
          {backlogExcerptLoading && (
            <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">
              Chargement des données...
            </div>
          )}
          {!backlogExcerptLoading && exerciseStartDate === null && (
            <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">
              Dates exercice invalides
            </div>
          )}
          {!backlogExcerptLoading && exerciseStartDate !== null && exerciseBacklogExcerptRows.length === 0 && (
            <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">
              Pas de données sur la période
            </div>
          )}
          {!backlogExcerptLoading && exerciseStartDate !== null && exerciseBacklogExcerptRows.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={exerciseBacklogExcerptRows} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPiExcerptTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPiExcerptOnprem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.onpremise} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.onpremise} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPiExcerptLive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.live} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.live} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPiExcerptHors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.horsVersion} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.horsVersion} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="date"
                  interval={0}
                  minTickGap={8}
                  tickFormatter={excerptTickFormatter}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, excerptYAxisMax]}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={ttStyle()} labelFormatter={(value) => excerptTooltipDateFormatter(String(value))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Area type="linear" dataKey="total" name="Total" stroke="#1E40AF" strokeWidth={2} fill="url(#gPiExcerptTotal)" />
                <Area type="linear" dataKey="onpremise" name="OnPremise" stroke={C.onpremise} strokeWidth={1.5} fill="url(#gPiExcerptOnprem)" />
                <Area type="linear" dataKey="live" name="Live" stroke={C.live} strokeWidth={1.5} fill="url(#gPiExcerptLive)" />
                <Area type="linear" dataKey="hors" name="Hors version" stroke={C.horsVersion} strokeWidth={1.5} fill="url(#gPiExcerptHors)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {!backlogExcerptLoading && backlogExcerptError && (
            <div className="pt-2 text-[11px] text-amber-600">
              Impossible de rafraîchir l&apos;évolution backlog ({backlogExcerptError}).
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-16">ID</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-[30%]">Titre</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-32">Version</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-24">État</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-32">Équipe</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-24">Créé</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-24">Fermé</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Évènements PI</th>
            </tr>
          </thead>
          <tbody>
            {filteredBugs.map((bug) => {
              const rowEvents = PI_EVENTS.filter((event) => hasPiEvent(bug, event, selectedPi));
              return (
                <tr
                  key={bug.id}
                  className={[
                    'border-b border-gray-50 transition-colors',
                    'hover:bg-blue-50/40',
                  ].join(' ')}
                >
                  <td className="px-4 py-2 font-mono text-gray-400">{bug.id}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-0" style={{ maxWidth: 300 }}>
                    <span
                      title={bug.title}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        whiteSpace: 'normal',
                        lineHeight: '1.25rem',
                        maxHeight: '2.5rem',
                      }}
                    >
                      {bug.title}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 font-mono">{bug.version || 'vide'}</td>
                  <td className="px-4 py-2">
                    <span className={[
                      'inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border',
                      STATE_BADGE[bug.state] ?? 'bg-gray-50 text-gray-500',
                    ].join(' ')}>
                      {bug.state}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{bug.team}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono">{bug.createdPi === selectedPi ? formatShortDate(bug.createdDate) : '-'}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono">{bug.closedPi === selectedPi ? formatShortDate(bug.closedDate) : '-'}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {rowEvents.length === 0 && <span className="text-[10px] text-gray-400">-</span>}
                      {rowEvents.map((event) => (
                        <span
                          key={`${bug.id}-${event}`}
                          className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium text-white"
                          style={{ backgroundColor: PI_EVENT_COLORS[event] }}
                        >
                          {PI_EVENT_LABEL[event]}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredBugs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                  Aucun bug touché sur ce PI pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// â”€â”€â”€ Tab 4 : Bugs fermes par PI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function axisMax(rawMax: number, min: number, step: number): number {
  const safe = Math.max(min, rawMax, 0);
  return Math.ceil(safe / step) * step;
}

function ClosedByPiTab({ refreshKey }: { refreshKey: number }) {
  const onpremBlue = '#60A5FA';
  const onpremPatchBlue = '#BFDBFE';

  const [byProduct, setByProduct] = useState(CLOSED_PRODUIT);
  const [byTeam, setByTeam] = useState(CLOSED_EQUIPE);
  const [teams, setTeams] = useState(TEAMS_LIST);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/kpis/closed-by-pi');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.byProduct)) setByProduct(data.byProduct);
        if (Array.isArray(data.byTeam)) setByTeam(data.byTeam);
        if (Array.isArray(data.teams) && data.teams.length > 0) setTeams(data.teams);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const byProductBarMax = useMemo(() => {
    const raw = byProduct.reduce(
      (acc, row) => Math.max(acc, row.live, row.livePatch, row.onpremise, row.onpremisePatch, row.horsVersion, row.nonCategorise),
      0,
    );
    return axisMax(raw, 20, 10);
  }, [byProduct]);

  const byProductTotalMax = useMemo(() => {
    const raw = byProduct.reduce((acc, row) => Math.max(acc, row.total), 0);
    return axisMax(raw, 60, 25);
  }, [byProduct]);

  const byTeamBarMax = useMemo(() => {
    const raw = byTeam.reduce((acc, row) => {
      const perRowMax = teams.reduce((teamMax, team) => {
        const value = Number((row as Record<string, unknown>)[team] ?? 0);
        if (!Number.isFinite(value)) return teamMax;
        return Math.max(teamMax, value);
      }, 0);
      return Math.max(acc, perRowMax);
    }, 0);
    return axisMax(raw, 20, 10);
  }, [byTeam, teams]);

  const byTeamTotalMax = useMemo(() => {
    const raw = byTeam.reduce((acc, row) => Math.max(acc, row.total), 0);
    return axisMax(raw, 60, 25);
  }, [byTeam]);

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-gray-400">Chargement des donnees...</div>}
      {error && <div className="text-xs text-red-500">Erreur KPI Bugs fermes par PI: {error}</div>}
      {/* Par produit */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm font-semibold text-[#0e1a38] mb-4">Par produit</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={byProduct} barCategoryGap="28%" barGap={1}
            margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="pi" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="bars" domain={[0, byProductBarMax]} allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="total" orientation="right" domain={[0, byProductTotalMax]} allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={ttStyle()} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            <Bar yAxisId="bars" dataKey="live"           name="Live"            fill={C.live}           maxBarSize={18} radius={[2,2,0,0]} />
            <Bar yAxisId="bars" dataKey="livePatch"      name="Live Patch"      fill={C.livePatch}      maxBarSize={18} radius={[2,2,0,0]} />
            <Bar yAxisId="bars" dataKey="onpremise"      name="OnPremise"       fill={onpremBlue}      maxBarSize={18} radius={[2,2,0,0]} />
            <Bar yAxisId="bars" dataKey="onpremisePatch" name="OnPremise Patch" fill={onpremPatchBlue} maxBarSize={18} radius={[2,2,0,0]} />
            <Bar yAxisId="bars" dataKey="horsVersion"    name="Hors version"    fill={C.horsVersion}    maxBarSize={18} radius={[2,2,0,0]} />
            <Bar yAxisId="bars" dataKey="nonCategorise"  name="Non categorise"  fill={C.nonCategorise}  maxBarSize={18} radius={[2,2,0,0]} />
            <Line yAxisId="total" type="monotone" dataKey="total" name="Total" stroke="#FCD34D" strokeWidth={2.2}
              strokeDasharray="5 3" dot={{ r: 4, fill: '#FCD34D', strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Par equipe */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm font-semibold text-[#0e1a38] mb-4">Par equipe</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={byTeam} barCategoryGap="28%" barGap={1}
            margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="pi" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="bars" domain={[0, byTeamBarMax]} allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="total" orientation="right" domain={[0, byTeamTotalMax]} allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={ttStyle()} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            {teams.map(t => (
              <Bar key={t} yAxisId="bars" dataKey={t} name={t} fill={C.teams[t]} maxBarSize={18} radius={[2,2,0,0]} />
            ))}
            <Line yAxisId="total" type="monotone" dataKey="total" name="Total" stroke="#FCD34D" strokeWidth={2.2}
              strokeDasharray="5 3" dot={{ r: 4, fill: '#FCD34D', strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TerrainReturnsTab({ refreshKey }: { refreshKey: number }) {
  const entrantsColor = '#60A5FA';
  const correctedColor = '#F472B6';
  const rows = TERRAIN_RETURNS_IMAGE_ROWS;
  const asOfDate = rows.find((r) => r.isCurrent)?.asOf ?? '';
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  useEffect(() => {
    setSelectedExercises(rows.map((row) => row.exercise));
  }, [refreshKey, rows]);

  const hasAllSelected = selectedExercises.length > 0 && selectedExercises.length === rows.length;
  const filteredRows = useMemo(() => {
    if (selectedExercises.length === 0) return rows;
    const selected = new Set(selectedExercises);
    return rows.filter((row) => selected.has(row.exercise));
  }, [rows, selectedExercises]);

  const yMax = useMemo(() => {
    const maxVal = filteredRows.reduce((acc, row) => Math.max(acc, row.entrants, row.corrected), 0);
    const target = Math.max(100, maxVal);
    return Math.ceil(target / 25) * 25;
  }, [filteredRows]);

  function toggleExercise(exercise: string) {
    setSelectedExercises((prev) => (
      prev.includes(exercise)
        ? prev.filter((v) => v !== exercise)
        : [...prev, exercise]
    ));
  }

  function selectAllExercises() {
    setSelectedExercises(rows.map((row) => row.exercise));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-gray-500">
          Donnees de reference de l'exemple. Exercice courant arrete au {new Date(`${asOfDate}T00:00:00.000Z`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}.
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={selectAllExercises}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${hasAllSelected ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-[#1E40AF] border-[#1E40AF]/30 hover:bg-blue-50'}`}
          >
            Tous
          </button>
          {rows.map((row) => {
            const active = selectedExercises.includes(row.exercise);
            return (
              <button
                key={row.exercise}
                type="button"
                onClick={() => toggleExercise(row.exercise)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}
              >
                {row.exercise}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm font-semibold text-[#0e1a38] mb-4">
          Evolution annuelle (par exercice) des bugs entrants et corriges "terrain"
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={filteredRows} margin={{ top: 8, right: 16, left: -6, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
            <YAxis domain={[0, yMax]} allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={ttStyle()} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              formatter={(value) => (value === 'Bugs terrain corriges' ? 'Bogues "terrain" corriges' : 'Bogues entrants')}
            />

            <Line type="monotone" dataKey="entrants" name="Bogues entrants" stroke={entrantsColor} strokeWidth={2.8} dot={{ r: 4, fill: entrantsColor, strokeWidth: 0 }}>
              <LabelList dataKey="entrants" position="top" fill={entrantsColor} fontSize={11} />
            </Line>
            <Line type="monotone" dataKey="corrected" name="Bugs terrain corriges" stroke={correctedColor} strokeWidth={2.8} dot={{ r: 4, fill: correctedColor, strokeWidth: 0 }}>
              <LabelList dataKey="corrected" position="top" fill={correctedColor} fontSize={11} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// â”€â”€â”€ Tab 6 : Backlogs equipes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatDateCell(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function TeamBacklogCard({
  t,
  selectedTeam,
  selectedState,
  selectedFiliere,
  selectedVersion,
  expandedVersions,
  onToggleTeam,
  onSelectTeamState,
  onToggleFiliere,
  onToggleVersion,
  onToggleVersions,
}: {
  t: TeamBacklog;
  selectedTeam: string | null;
  selectedState: string | null;
  selectedFiliere: TeamBacklogFiliereFilter;
  selectedVersion: string | null;
  expandedVersions: boolean;
  onToggleTeam: (team: string) => void;
  onSelectTeamState: (team: string, state: string) => void;
  onToggleFiliere: (filiere: TeamBacklogFiliereFilter) => void;
  onToggleVersion: (version: string) => void;
  onToggleVersions: () => void;
}) {
  const pct = t.objective > 0
    ? Math.round((t.gcBugs / t.objective) * 100)
    : (t.gcBugs > 0 ? 100 : 0);
  const over = t.gcBugs > t.objective;
  const warn = pct >= 80 && !over;
  const barCls = over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-green-500';
  const cntCls = over ? 'text-red-600' : warn ? 'text-amber-600' : 'text-green-600';
  const coIwCount = t.coBugs + t.iwBugs;
  const teamActive = selectedTeam === t.team;
  const versionDenominator = Math.max(1, t.newBugs + t.activeBugs + t.resolvedBugs);
  const visibleVersions = expandedVersions ? t.topVersions : t.topVersions.slice(0, 3);

  return (
    <div className={`bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow ${
      teamActive
        ? 'border-blue-200 ring-2 ring-blue-100'
        : (over ? 'border-red-100' : warn ? 'border-amber-100' : 'border-gray-100')
    }`}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onToggleTeam(t.team)}
          className={[
            'text-sm font-bold transition-colors',
            teamActive ? 'text-blue-700' : 'text-[#0e1a38] hover:text-blue-700',
          ].join(' ')}
          title="Filtrer sur cette equipe"
        >
          {t.team}
        </button>
        <div className={`text-xs font-mono font-bold ${cntCls}`}>
          {t.gcBugs} / {t.objective}
          {over && <span className="ml-1 text-[10px] bg-red-100 px-1 rounded">DEPASSE</span>}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => onSelectTeamState(t.team, 'New')}
          className={[
            'text-[10px] border px-2 py-0.5 rounded-md transition-colors',
            selectedState === 'New' && teamActive
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300',
          ].join(' ')}
        >
          New {t.newBugs}
        </button>
        <button
          type="button"
          onClick={() => onSelectTeamState(t.team, 'Active')}
          className={[
            'text-[10px] border px-2 py-0.5 rounded-md transition-colors',
            selectedState === 'Active' && teamActive
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-300',
          ].join(' ')}
        >
          Active {t.activeBugs}
        </button>
        <button
          type="button"
          onClick={() => onSelectTeamState(t.team, 'Resolved')}
          className={[
            'text-[10px] border px-2 py-0.5 rounded-md transition-colors',
            selectedState === 'Resolved' && teamActive
              ? 'bg-violet-600 text-white border-violet-600'
              : 'bg-violet-50 text-violet-600 border-violet-100 hover:border-violet-300',
          ].join(' ')}
        >
          Resolved {t.resolvedBugs}
        </button>
        {coIwCount > 0 && (
          <button
            type="button"
            onClick={() => onToggleFiliere('CO_IW')}
            className={[
              'text-[10px] border px-2 py-0.5 rounded-md transition-colors',
              selectedFiliere === 'CO_IW'
                ? 'bg-gray-600 text-white border-gray-600'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300',
            ].join(' ')}
            title="Filtrer CO et IW"
          >
            +{coIwCount} CO/IW
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {visibleVersions.map((v) => {
          const versionValue = v.version || 'vide';
          return (
            <div key={v.version} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleVersion(versionValue)}
                className={[
                  'text-[10px] font-mono w-24 truncate shrink-0 text-left transition-colors',
                  selectedVersion === versionValue
                    ? 'text-blue-700 font-semibold'
                    : 'text-gray-400 hover:text-blue-600',
                ].join(' ')}
                title="Filtrer sur cette version"
              >
                {versionValue}
              </button>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-200 rounded-full" style={{ width: `${Math.min(100, Math.round((v.count / versionDenominator) * 100))}%` }} />
              </div>
              <span className="text-[10px] font-mono text-gray-500 w-4 text-right shrink-0">{v.count}</span>
            </div>
          );
        })}
        {t.topVersions.length > 3 && (
          <button
            type="button"
            onClick={onToggleVersions}
            className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
          >
            {expandedVersions ? '- Voir moins' : `+ ${t.topVersions.length - 3} version(s)`}
          </button>
        )}
      </div>
    </div>
  );
}

function TeamBacklogsTab({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState(TEAM_BACKLOGS);
  const [bugs, setBugs] = useState<TeamBacklogBug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedFiliere, setSelectedFiliere] = useState<TeamBacklogFiliereFilter>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<TeamBacklogSortKey>('changedDate');
  const [sortDir, setSortDir] = useState<TeamBacklogSortDir>('desc');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/kpis/team-backlogs');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        if (Array.isArray(data)) {
          setRows(data);
          setBugs([]);
          return;
        }
        const payload = data as TeamBacklogsResponse;
        setRows(Array.isArray(payload.teams) ? payload.teams : []);
        setBugs(Array.isArray(payload.bugs) ? payload.bugs : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      if (selectedTeam && bug.team !== selectedTeam) return false;
      if (selectedState && bug.state !== selectedState) return false;
      if (selectedVersion && bug.version !== selectedVersion) return false;
      if (selectedFiliere === 'GC' && bug.filiere !== 'GC') return false;
      if (selectedFiliere === 'CO_IW' && bug.filiere !== 'CO' && bug.filiere !== 'IW') return false;
      if (selectedFiliere === 'CO' && bug.filiere !== 'CO') return false;
      if (selectedFiliere === 'IW' && bug.filiere !== 'IW') return false;
      return true;
    });
  }, [bugs, selectedFiliere, selectedState, selectedTeam, selectedVersion]);

  const sortedFilteredBugs = useMemo(() => {
    const dirFactor = sortDir === 'asc' ? 1 : -1;
    const asText = (value: string | null) => (value ?? '').trim();
    const asTime = (value: string | null) => {
      if (!value) return Number.NEGATIVE_INFINITY;
      const ms = Date.parse(value);
      return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
    };
    const compareText = (a: string | null, b: string | null) =>
      asText(a).localeCompare(asText(b), 'fr', { sensitivity: 'base', numeric: true });

    const data = [...filteredBugs];
    data.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'id':
          cmp = a.id - b.id;
          break;
        case 'title':
          cmp = compareText(a.title, b.title);
          break;
        case 'state':
          cmp = compareText(a.state, b.state);
          break;
        case 'version':
          cmp = compareText(a.version, b.version);
          break;
        case 'team':
          cmp = compareText(a.team, b.team);
          break;
        case 'filiere':
          cmp = compareText(a.filiere, b.filiere);
          break;
        case 'sprint':
          cmp = compareText(a.sprint, b.sprint);
          break;
        case 'createdDate':
          cmp = asTime(a.createdDate) - asTime(b.createdDate);
          break;
        case 'changedDate':
          cmp = asTime(a.changedDate) - asTime(b.changedDate);
          break;
      }

      if (cmp === 0) cmp = a.id - b.id;
      return cmp * dirFactor;
    });
    return data;
  }, [filteredBugs, sortDir, sortKey]);

  const hasFilter = Boolean(selectedTeam || selectedState || selectedFiliere || selectedVersion);

  function clearFilters() {
    setSelectedTeam(null);
    setSelectedState(null);
    setSelectedFiliere(null);
    setSelectedVersion(null);
  }

  function toggleTeam(team: string) {
    setSelectedTeam((prev) => (prev === team ? null : team));
  }
  function toggleState(state: string) {
    setSelectedState((prev) => (prev === state ? null : state));
  }
  function selectTeamState(team: string, state: string) {
    const sameCombo = selectedTeam === team && selectedState === state;
    setSelectedTeam(team);
    setSelectedState(sameCombo ? null : state);
    setSelectedFiliere(null);
    setSelectedVersion(null);
  }
  function toggleFiliere(filiere: TeamBacklogFiliereFilter) {
    setSelectedFiliere((prev) => (prev === filiere ? null : filiere));
  }
  function toggleVersion(version: string) {
    setSelectedVersion((prev) => (prev === version ? null : version));
  }
  function toggleVersionsForTeam(team: string) {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  }

  function toggleSort(nextKey: TeamBacklogSortKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDir(nextKey === 'id' || nextKey === 'createdDate' || nextKey === 'changedDate' ? 'desc' : 'asc');
  }

  function sortIcon(key: TeamBacklogSortKey) {
    const active = sortKey === key;
    const glyph = active ? (sortDir === 'asc' ? '↑' : '↓') : '↕';
    return (
      <span className={`text-[10px] leading-none ${active ? 'text-[#1E40AF]' : 'text-gray-300 group-hover:text-gray-400'}`}>
        {glyph}
      </span>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs text-gray-400">
          Bugs GC uniquement (hors [CO] et [IW]) - les bugs New et Active uniquement rentrent dans le compteur.
        </p>
      </div>
      {loading && <div className="text-xs text-gray-400 mb-3">Chargement des donnees...</div>}
      {error && <div className="text-xs text-red-500 mb-3">Erreur KPI Backlogs equipes: {error}</div>}
      <div className="grid grid-cols-4 gap-4">
        {rows.map(t => (
          <TeamBacklogCard
            key={t.team}
            t={t}
            selectedTeam={selectedTeam}
            selectedState={selectedState}
            selectedFiliere={selectedFiliere}
            selectedVersion={selectedVersion}
            expandedVersions={expandedTeams.has(t.team)}
            onToggleTeam={toggleTeam}
            onSelectTeamState={selectTeamState}
            onToggleFiliere={toggleFiliere}
            onToggleVersion={toggleVersion}
            onToggleVersions={() => toggleVersionsForTeam(t.team)}
          />
        ))}
      </div>

      <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-[#0e1a38]">Liste des bugs backlog</div>
          <div className="text-xs text-gray-400">
            {filteredBugs.length} / {bugs.length} bug{bugs.length > 1 ? 's' : ''}
          </div>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => toggleState('New')}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${selectedState === 'New' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'}`}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => toggleState('Active')}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${selectedState === 'Active' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300'}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => toggleState('Resolved')}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${selectedState === 'Resolved' ? 'bg-violet-600 text-white border-violet-600' : 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-300'}`}
          >
            Resolved
          </button>
          <button
            type="button"
            onClick={() => toggleFiliere('CO')}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${selectedFiliere === 'CO' ? 'bg-gray-600 text-white border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            CO
          </button>
          <button
            type="button"
            onClick={() => toggleFiliere('GC')}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${selectedFiliere === 'GC' ? 'bg-gray-700 text-white border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'}`}
          >
            GC
          </button>
          <button
            type="button"
            onClick={() => toggleFiliere('IW')}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${selectedFiliere === 'IW' ? 'bg-gray-600 text-white border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            IW
          </button>
          <button
            type="button"
            onClick={() => toggleFiliere('CO_IW')}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${selectedFiliere === 'CO_IW' ? 'bg-gray-700 text-white border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'}`}
          >
            CO/IW
          </button>
          {selectedTeam && (
            <button
              type="button"
              onClick={() => setSelectedTeam(null)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400"
              title="Retirer le filtre equipe"
            >
              Equipe: {selectedTeam} x
            </button>
          )}
          {selectedVersion && (
            <button
              type="button"
              onClick={() => setSelectedVersion(null)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300"
              title="Retirer le filtre version"
            >
              Version: {selectedVersion} x
            </button>
          )}
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 text-[11px] px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 hover:text-blue-700 hover:border-blue-300"
            >
              Reinitialiser les filtres
            </button>
          )}
          {!hasFilter && (
            <span className="text-[11px] text-gray-400 ml-1">Aucun filtre actif: affichage complet</span>
          )}
        </div>

        <div className="overflow-auto">
          <table className="w-full text-xs min-w-[1020px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-20">
                  <button type="button" onClick={() => toggleSort('id')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    ID
                    {sortIcon('id')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort('title')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    Title
                    {sortIcon('title')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-24">
                  <button type="button" onClick={() => toggleSort('state')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    State
                    {sortIcon('state')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-28">
                  <button type="button" onClick={() => toggleSort('version')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    Version
                    {sortIcon('version')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-32">
                  <button type="button" onClick={() => toggleSort('team')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    Equipe
                    {sortIcon('team')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-20">
                  <button type="button" onClick={() => toggleSort('filiere')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    Filiere
                    {sortIcon('filiere')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-24">
                  <button type="button" onClick={() => toggleSort('sprint')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    Sprint
                    {sortIcon('sprint')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-32">
                  <button type="button" onClick={() => toggleSort('createdDate')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    Cree le
                    {sortIcon('createdDate')}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide w-32">
                  <button type="button" onClick={() => toggleSort('changedDate')} className="group inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
                    Modifie le
                    {sortIcon('changedDate')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFilteredBugs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Aucun bug ne correspond au filtre.
                  </td>
                </tr>
              ) : (
                sortedFilteredBugs.map((bug) => (
                  <tr key={bug.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2 font-mono">
                      <a
                        href={`${ADO_WORK_ITEM_BASE}${bug.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        title={`Ouvrir le bug ${bug.id} dans Azure DevOps`}
                      >
                        {bug.id}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-0">
                      <span className="block truncate" title={bug.title}>{bug.title}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-medium ${STATE_BADGE[bug.state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {bug.state}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-gray-600">{bug.version || 'vide'}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleTeam(bug.team)}
                        className={[
                          'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                          selectedTeam === bug.team
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700',
                        ].join(' ')}
                      >
                        {bug.team}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleFiliere(bug.filiere)}
                        className={[
                          'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                          selectedFiliere === bug.filiere
                            ? 'bg-gray-700 text-white border-gray-700'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300',
                        ].join(' ')}
                      >
                        {bug.filiere}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{bug.sprint || '-'}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono">{formatDateCell(bug.createdDate)}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono">{formatDateCell(bug.changedDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RetentionTab({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<RetentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentType, setSegmentType] = useState<RetentionSegmentType>('product');
  const [selectedSegmentKey, setSelectedSegmentKey] = useState<RetentionSegmentKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/kpis/retention');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json() as RetentionResponse;
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const segments = useMemo(
    () => segmentType === 'filiere' ? (data?.filiere ?? []) : (data?.product ?? []),
    [data, segmentType],
  );

  useEffect(() => {
    if (segments.length === 0) {
      setSelectedSegmentKey(null);
      return;
    }
    setSelectedSegmentKey((prev) => {
      if (prev && segments.some((segment) => segment.key === prev)) return prev;
      return segments[0].key;
    });
  }, [segments]);

  const distribution = useMemo(() => {
    if (!data || !selectedSegmentKey) return [];
    return data.distributions.find(
      (entry) => entry.segmentType === segmentType && entry.segmentKey === selectedSegmentKey,
    )?.buckets ?? [];
  }, [data, segmentType, selectedSegmentKey]);

  const selectedSegmentLabel = useMemo(() => {
    if (!selectedSegmentKey) return '';
    return segments.find((segment) => segment.key === selectedSegmentKey)?.label ?? '';
  }, [segments, selectedSegmentKey]);

  const summary = data?.summary;

  return (
    <div>
      {loading && <div className="text-xs text-gray-400 mb-3">Chargement des donnees...</div>}
      {error && <div className="text-xs text-red-500 mb-3">Erreur KPI Retention: {error}</div>}

      {data && summary && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bugs suivis</div>
              <div className="mt-2 text-2xl font-semibold text-[#0e1a38]">{summary.totalBugs}</div>
              <div className="mt-1 text-[11px] text-gray-400">Données au {new Date(`${data.asOfDate}T00:00:00Z`).toLocaleDateString('fr-FR')}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Backlog ouvert</div>
              <div className="mt-2 text-2xl font-semibold text-[#0e1a38]">{summary.openCount}</div>
              <div className="mt-1 text-[11px] text-gray-400">{summary.over60OpenRate.toFixed(1)}% &gt; 60j</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Fermés analysés</div>
              <div className="mt-2 text-2xl font-semibold text-[#0e1a38]">{summary.closedCount}</div>
              <div className="mt-1 text-[11px] text-gray-400">Médiane fermeture: {summary.medianCloseDays.toFixed(1)} j</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Âge backlog ouvert</div>
              <div className="mt-2 text-2xl font-semibold text-[#0e1a38]">{summary.medianOpenAgeDays.toFixed(1)} j</div>
              <div className="mt-1 text-[11px] text-gray-400">{summary.over90OpenRate.toFixed(1)}% &gt; 90j</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
            <div className="text-xs text-gray-500">
              Période d'analyse: <strong>{data.period.label}</strong> du{' '}
              <strong>{new Date(`${data.period.start}T00:00:00Z`).toLocaleDateString('fr-FR')}</strong> au{' '}
              <strong>{new Date(`${data.period.end}T00:00:00Z`).toLocaleDateString('fr-FR')}</strong>.
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Âge médian (j): médiane du nombre de jours depuis la création des bugs encore ouverts.
              Fermeture médiane (j): médiane du délai création → fermeture pour les bugs fermés sur la période.
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Comparatif rétention</div>
              <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setSegmentType('filiere')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${segmentType === 'filiere' ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Par filière
                </button>
                <button
                  type="button"
                  onClick={() => setSegmentType('product')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${segmentType === 'product' ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Par produit
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={segments} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} barGap={1} barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={ttStyle()}
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value ?? 0);
                    if (String(name).includes('%')) return [`${n.toFixed(1)}%`, String(name)];
                    return [`${n.toFixed(1)} j`, String(name)];
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="medianCloseDays" name="Fermeture médiane (j)" fill="#6FAEEB" maxBarSize={28} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="medianOpenAgeDays" name="Âge médian ouvert (j)" fill="#F4A8C6" maxBarSize={28} radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="over60OpenRate" name="% ouverts > 60j" stroke="#7C3AED" strokeWidth={2} dot={{ r: 2.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Détail des indicateurs
              </div>
              <div className="overflow-auto">
                <table className="w-full text-xs min-w-[680px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Segment</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Ouverts</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Fermés</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Âge médian (j)</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Fermeture médiane (j)</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">% &gt; 60j</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((segment) => (
                      <tr key={segment.key} className="border-b border-gray-50">
                        <td className="px-3 py-2 text-[#0e1a38] font-medium">{segment.label}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{segment.openCount}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{segment.closedCount}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{segment.medianOpenAgeDays.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{segment.medianCloseDays.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{segment.over60OpenRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {segments.map((segment) => (
                  <button
                    key={segment.key}
                    type="button"
                    onClick={() => setSelectedSegmentKey(segment.key)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${selectedSegmentKey === segment.key ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {segment.label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Répartition âge backlog ouvert - {selectedSegmentLabel}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={distribution} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle()} />
                  <Bar dataKey="count" name="Bugs ouverts" fill="#8FBFF6" maxBarSize={34} radius={[3, 3, 0, 0]}>
                    {distribution.map((bucket, index) => (
                      <Cell key={`${bucket.bucket}-${index}`} fill={bucket.bucket === '>90j' ? '#F4A8C6' : '#8FBFF6'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Kpis() {
  const [tab, setTab] = useState<TabKey>('defect-debt');
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    step: syncStep,
    result: syncResult,
    error: syncError,
    run: runSync,
    clearResult: clearSyncResult,
    clearError: clearSyncError,
  } = useSyncAndEvaluate(async () => {
    setRefreshKey((k) => k + 1);
  });

  const headerActions = (
    <SyncButton step={syncStep} onClick={runSync} />
  );

  return (
    <Layout title="KPIs & Suivi qualite" actions={headerActions} contentClassName="px-7 pb-7 pt-0">
      {syncResult && (
        <div className="mt-5 mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
          <span>
            Synchronisation terminee - <strong>{syncResult.synced}</strong> bugs importes,{' '}
            <strong>{syncResult.checkedBugs}</strong> analyses,{' '}
            <strong className="text-red-600">{syncResult.newViolations}</strong> nouvelles anomalies,{' '}
            <strong className="text-green-700">{syncResult.resolvedViolations}</strong> resolues.
          </span>
          <button onClick={clearSyncResult} className="ml-auto text-blue-400 hover:text-blue-600 text-lg leading-none">x</button>
        </div>
      )}
      {syncError && (
        <div className="mt-5 mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur de synchronisation/evaluation : {syncError}</span>
          <button onClick={clearSyncError} className="text-red-400 hover:text-red-600">x</button>
        </div>
      )}
      {/* Tab bar â€” sticky dans la zone scrollable */}
      <div className="sticky top-0 z-20 -mx-7 mb-5 bg-[#f7f8fc] px-7 pt-3 pb-3">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-2">
          <div className="flex gap-0.5 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-[#1E40AF] text-[#1E40AF]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'defect-debt'   && <DefectDebtTab refreshKey={refreshKey} />}
      {tab === 'backlog-evo'   && <BacklogEvoTab refreshKey={refreshKey} />}
      {tab === 'terrain-returns' && <TerrainReturnsTab refreshKey={refreshKey} />}
      {tab === 'retention' && <RetentionTab refreshKey={refreshKey} />}
      {tab === 'suivi-release' && <SuiviReleaseTab refreshKey={refreshKey} />}
      {tab === 'suivi-pi' && <SuiviPiTab refreshKey={refreshKey} />}
      {tab === 'closed-by-pi'  && <ClosedByPiTab refreshKey={refreshKey} />}
      {tab === 'team-backlogs' && <TeamBacklogsTab refreshKey={refreshKey} />}
    </Layout>
  );
}










