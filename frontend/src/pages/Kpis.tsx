import { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Select } from '../components/Select';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, AreaChart, Area, PieChart, Pie, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'defect-debt',    label: 'Defect Debt'         },
  { key: 'backlog-evo',    label: 'Évolution backlog'    },
  { key: 'suivi-release',  label: 'Suivi par release'    },
  { key: 'closed-by-pi',  label: 'Bugs fermés par PI'   },
  { key: 'team-backlogs',  label: 'Backlogs équipes'    },
] as const;
type TabKey = typeof TABS[number]['key'];

// ─── Colors ───────────────────────────────────────────────────────────────────

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

// Tab 1 — Defect Debt (créés - fermés par PI)
const DD_RAW = [
  { pi: '24-25 PI4', global:  120, live:  55, onpremise: -10, hors:   2, endGlobal: 340, endLive:  85, endOnpremise: 230, endHors: 25 },
  { pi: '24-25 PI5', global: -180, live: -45, onpremise:  -8, hors:  -3, endGlobal: 295, endLive:  65, endOnpremise: 210, endHors: 20 },
  { pi: '24-25 PI6', global: -290, live: -80, onpremise:   5, hors:   5, endGlobal: 420, endLive: 120, endOnpremise: 270, endHors: 30 },
  { pi: '25-26 PI1', global:  180, live:  60, onpremise:  35, hors:   4, endGlobal: 265, endLive: 100, endOnpremise: 140, endHors: 25 },
  { pi: '25-26 PI2', global: -160, live: -75, onpremise: -22, hors:  -5, endGlobal: 220, endLive:  95, endOnpremise: 108, endHors: 17 },
  { pi: '25-26 PI3', global:   35, live:  12, onpremise:   8, hors:   1, endGlobal: 247, endLive: 107, endOnpremise: 122, endHors: 18 },
  { pi: '25-26 PI4', global:   48, live:  18, onpremise:  10, hors:   2, endGlobal: 252, endLive: 110, endOnpremise: 124, endHors: 18 },
];

// Tab 2 — Backlog evolution (snapshots mensuels)
const BACKLOG_EVO = [
  { date: '2025-04-01', label: 'Avr 25', total: 335, live: 62,  onpremise: 254, hors: 19 },
  { date: '2025-05-01', label: 'Mai 25', total: 340, live: 65,  onpremise: 256, hors: 19 },
  { date: '2025-06-01', label: 'Jun 25', total: 347, live: 68,  onpremise: 260, hors: 19 },
  { date: '2025-07-01', label: 'Jul 25', total: 410, live: 72,  onpremise: 318, hors: 20 },
  { date: '2025-08-01', label: 'Aoû 25', total: 265, live: 88,  onpremise: 157, hors: 20 },
  { date: '2025-09-01', label: 'Sep 25', total: 248, live: 92,  onpremise: 138, hors: 18 },
  { date: '2025-10-01', label: 'Oct 25', total: 242, live: 95,  onpremise: 130, hors: 17 },
  { date: '2025-11-01', label: 'Nov 25', total: 228, live: 92,  onpremise: 119, hors: 17 },
  { date: '2025-12-01', label: 'Déc 25', total: 220, live: 90,  onpremise: 113, hors: 17 },
  { date: '2026-01-01', label: 'Jan 26', total: 230, live: 95,  onpremise: 117, hors: 18 },
  { date: '2026-02-01', label: 'Fév 26', total: 242, live: 100, onpremise: 123, hors: 19 },
  { date: '2026-03-01', label: 'Mar 26', total: 252, live: 107, onpremise: 127, hors: 18 },
];

// Tab 3 — Suivi par release
const VERSIONS_LIST = ['FAH_26.20', 'FAH_26.30', '13.87.200', '13.87.250', 'Non concerné'];

interface ReleaseBug { id: number; title: string; state: string; team: string; sprint: string }
interface ReleaseData {
  byState: { name: string; value: number; color: string }[];
  byTeam:  { name: string; value: number; color: string }[];
  bugs:    ReleaseBug[];
}
const RELEASE_DATA: Record<string, ReleaseData> = {
  'FAH_26.20': {
    byState: [
      { name: 'New',      value: 42, color: C.stateNew      },
      { name: 'Active',   value: 15, color: C.stateActive   },
      { name: 'Resolved', value:  3, color: C.stateResolved },
    ],
    byTeam: [
      { name: 'COCO',          value:  8, color: C.teams['COCO']          },
      { name: 'GO FAHST',      value:  9, color: C.teams['GO FAHST']      },
      { name: 'JURASSIC BACK', value:  8, color: C.teams['JURASSIC BACK'] },
      { name: 'LACE',          value:  4, color: C.teams['LACE']          },
      { name: 'MAGIC SYSTEM',  value:  1, color: C.teams['MAGIC SYSTEM']  },
      { name: 'MELI MELO',     value:  6, color: C.teams['MELI MELO']     },
      { name: 'NULL.REF',      value:  9, color: C.teams['NULL.REF']      },
      { name: 'PIXELS',        value:  7, color: C.teams['PIXELS']        },
      { name: 'À corriger',    value:  8, color: '#D1D5DB'                },
    ],
    bugs: [
      { id: 190961, title: '[CI] 3 tests incompatibles avec CO 25.11.081',                              state: 'New',      team: 'COCO',          sprint: 'PI4'     },
      { id: 171163, title: '[CO] Nombre de requête anormalement élevé lors de la comptabilisation',      state: 'New',      team: 'GO FAHST',      sprint: '2025-2026' },
      { id: 227933, title: '[CO] Plante en essayant de se connecter en compta',                          state: 'Active',   team: 'NULL.REF',      sprint: 'PI2-SP1' },
      { id: 266738, title: '[Embedded] Historique client - L\'annulation d\'affectation d\'avoir',       state: 'New',      team: 'PIXELS',        sprint: 'PI4-SP4' },
      { id: 145490, title: '[IQS] Enregistrement d\'une facture : dégradation des performances',         state: 'New',      team: 'À corriger',    sprint: '2025-2026' },
      { id: 183440, title: '[IW] - LIVE - Le correcteur d\'orthographe n\'est pas opérationnel',         state: 'New',      team: 'GO FAHST',      sprint: '2025-2026' },
      { id: 132834, title: '[IW] .NetCore - Appels aux API REST - plante de la lecture',                  state: 'Active',   team: 'LACE',          sprint: '2025-2026' },
      { id: 200628, title: '[IW] [GCLive] Quids pour Stimulsoft : LA fonction Moyenne pondérée',          state: 'Resolved', team: 'JURASSIC BACK', sprint: 'PI5'     },
    ],
  },
  'FAH_26.30': {
    byState: [
      { name: 'New',    value: 28, color: C.stateNew    },
      { name: 'Active', value:  8, color: C.stateActive },
    ],
    byTeam: [
      { name: 'GO FAHST',     value: 10, color: C.teams['GO FAHST']     },
      { name: 'MAGIC SYSTEM', value:  8, color: C.teams['MAGIC SYSTEM'] },
      { name: 'MELI MELO',    value:  7, color: C.teams['MELI MELO']    },
      { name: 'NULL.REF',     value:  6, color: C.teams['NULL.REF']     },
      { name: 'PIXELS',       value:  5, color: C.teams['PIXELS']       },
    ],
    bugs: [
      { id: 249783, title: '[Embedded] Problème d\'affichage du scroll dans le tableau lors d\'un changement d\'onglet', state: 'New',    team: 'MAGIC SYSTEM', sprint: 'PI5'    },
      { id: 266635, title: '[Documents] - Factures - Comptabilisation - La comptabilisation de facture plante',          state: 'Active', team: 'MELI MELO',    sprint: 'PI5-SP1' },
    ],
  },
  '13.87.200': {
    byState: [
      { name: 'New',      value: 18, color: C.stateNew      },
      { name: 'Active',   value: 12, color: C.stateActive   },
      { name: 'Resolved', value:  5, color: C.stateResolved },
    ],
    byTeam: [
      { name: 'MAGIC SYSTEM',  value: 12, color: C.teams['MAGIC SYSTEM']  },
      { name: 'COCO',          value:  8, color: C.teams['COCO']          },
      { name: 'JURASSIC BACK', value:  8, color: C.teams['JURASSIC BACK'] },
      { name: 'À corriger',    value:  7, color: '#D1D5DB'                },
    ],
    bugs: [
      { id: 206120, title: '[13.8X] La purge sur un gros dossier provoque une erreur', state: 'Active', team: 'MAGIC SYSTEM', sprint: 'PI4' },
    ],
  },
  '13.87.250': {
    byState: [
      { name: 'New',    value: 10, color: C.stateNew    },
      { name: 'Active', value:  5, color: C.stateActive },
    ],
    byTeam: [
      { name: 'MAGIC SYSTEM', value: 9, color: C.teams['MAGIC SYSTEM'] },
      { name: 'MELI MELO',    value: 4, color: C.teams['MELI MELO']    },
      { name: 'LACE',         value: 2, color: C.teams['LACE']         },
    ],
    bugs: [],
  },
  'Non concerné': {
    byState: [
      { name: 'New',    value: 14, color: C.stateNew    },
      { name: 'Active', value:  8, color: C.stateActive },
    ],
    byTeam: [
      { name: 'GO FAHST', value: 8, color: C.teams['GO FAHST'] },
      { name: 'PIXELS',   value: 6, color: C.teams['PIXELS']   },
      { name: 'LACE',     value: 5, color: C.teams['LACE']     },
      { name: 'COCO',     value: 3, color: C.teams['COCO']      },
    ],
    bugs: [
      { id: 97659, title: '[Délégation IW] Ajouter une étape "Configure" sur les Modules avant OnInitialized', state: 'New', team: 'GO FAHST', sprint: 'PI4' },
    ],
  },
};

// Tab 4 — Bugs fermés par PI
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

// Tab 5 — Backlogs équipes (objectifs à configurer dans Paramètres)
interface TeamBacklog {
  team:        string;
  objective:   number;
  gcBugs:      number;
  newBugs:     number;
  activeBugs:  number;
  coBugs:      number;
  iwBugs:      number;
  topVersions: { version: string; count: number }[];
}
const TEAM_BACKLOGS: TeamBacklog[] = [
  { team: 'COCO',          objective:  8, gcBugs:  7, newBugs:  5, activeBugs: 2, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 4 }, { version: 'FAH_26.30', count: 2 }, { version: '-', count: 1 }] },
  { team: 'GO FAHST',      objective:  5, gcBugs:  6, newBugs:  4, activeBugs: 2, coBugs: 2, iwBugs: 3, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: 'FAH_26.30', count: 2 }, { version: 'FAH_26.10', count: 1 }] },
  { team: 'JURASSIC BACK', objective:  8, gcBugs:  6, newBugs:  5, activeBugs: 1, coBugs: 0, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: '13.87.200', count: 2 }, { version: 'FAH_26.30', count: 1 }] },
  { team: 'MAGIC SYSTEM',  objective: 20, gcBugs: 18, newBugs: 13, activeBugs: 5, coBugs: 1, iwBugs: 0, topVersions: [{ version: '13.87.250', count: 8 }, { version: '13.87.200', count: 6 }, { version: 'FAH_26.20', count: 3 }] },
  { team: 'MELI MELO',     objective:  8, gcBugs:  9, newBugs:  6, activeBugs: 3, coBugs: 2, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 5 }, { version: 'FAH_26.30', count: 3 }, { version: '-', count: 1 }] },
  { team: 'NULL.REF',      objective: 10, gcBugs: 10, newBugs:  7, activeBugs: 3, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 5 }, { version: 'FAH_26.10', count: 3 }, { version: 'FAH_26.30', count: 2 }] },
  { team: 'PIXELS',        objective:  7, gcBugs:  5, newBugs:  4, activeBugs: 1, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: 'FAH_26.30', count: 1 }, { version: '-', count: 1 }] },
  { team: 'LACE',          objective: 10, gcBugs:  8, newBugs:  6, activeBugs: 2, coBugs: 0, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 4 }, { version: 'FAH_26.30', count: 3 }, { version: '13.87.200', count: 1 }] },
];

// ─── Shared ───────────────────────────────────────────────────────────────────

function ttStyle() {
  return { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' };
}

const STATE_BADGE: Record<string, string> = {
  New:      'bg-blue-50 text-blue-700 border-blue-200',
  Active:   'bg-amber-50 text-amber-700 border-amber-200',
  Resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  Closed:   'bg-gray-100 text-gray-500 border-gray-200',
};

// ─── Tab 1 : Defect Debt ──────────────────────────────────────────────────────

interface DebtRow { pi: string; debt: number; endBugs: number }

function DebtChart({ title, data }: { title: string; data: DebtRow[] }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="pi" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
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

function DefectDebtTab() {
  const [selectedPis, setSelectedPis] = useState<Set<string>>(new Set(DD_RAW.map(d => d.pi)));
  const filtered = DD_RAW.filter(d => selectedPis.has(d.pi));

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
        {DD_RAW.map(({ pi }) => (
          <button key={pi} onClick={() => togglePi(pi)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              selectedPis.has(pi)
                ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >{pi}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DebtChart title="Global"            data={filtered.map(d => ({ pi: d.pi, debt: d.global,    endBugs: d.endGlobal    }))} />
        <DebtChart title="Live (FAH)"        data={filtered.map(d => ({ pi: d.pi, debt: d.live,      endBugs: d.endLive      }))} />
        <DebtChart title="OnPremise (13.8x)" data={filtered.map(d => ({ pi: d.pi, debt: d.onpremise, endBugs: d.endOnpremise }))} />
        <DebtChart title="Hors version"      data={filtered.map(d => ({ pi: d.pi, debt: d.hors,      endBugs: d.endHors      }))} />
      </div>
      <div className="flex items-center gap-5 mt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" /> Dette qui diminue</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Dette qui augmente</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-purple-400" /> Bugs ouverts fin PI</span>
      </div>
    </div>
  );
}

// ─── Tab 2 : Évolution backlog ────────────────────────────────────────────────

function BacklogEvoTab() {
  const [dateFrom, setDateFrom] = useState('2025-04-01');
  const [dateTo,   setDateTo]   = useState('2026-03-01');

  const filtered = useMemo(
    () => BACKLOG_EVO.filter(d => d.date >= dateFrom && d.date <= dateTo),
    [dateFrom, dateTo],
  );

  return (
    <div>
      {/* Filtres date */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-gray-500">Du</span>
        <input type="date" value={dateFrom} min="2025-04-01" max={dateTo}
          onChange={e => setDateFrom(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#0e1a38] focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <span className="text-sm text-gray-500">au</span>
        <input type="date" value={dateTo} min={dateFrom} max="2026-03-01"
          onChange={e => setDateTo(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#0e1a38] focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <span className="text-xs text-gray-400 ml-1">{filtered.length} point{filtered.length > 1 ? 's' : ''}</span>
      </div>

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
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={ttStyle()} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Area type="monotone" dataKey="total"     name="Total"        stroke="#1E40AF"       strokeWidth={2}   fill="url(#gTotal)"  />
            <Area type="monotone" dataKey="onpremise" name="OnPremise"    stroke={C.onpremise}   strokeWidth={1.5} fill="url(#gOnprem)" />
            <Area type="monotone" dataKey="live"      name="Live"         stroke={C.live}        strokeWidth={1.5} fill="url(#gLive)"   />
            <Area type="monotone" dataKey="hors"      name="Hors version" stroke={C.horsVersion} strokeWidth={1.5} fill="url(#gHors)"   />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Tab 3 : Suivi par release ────────────────────────────────────────────────

function ClickablePie({
  data, title, selected, onSelect,
}: {
  data: { name: string; value: number; color: string }[];
  title: string;
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex-1 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      <div className="relative">
        {data.length === 0 ? (
          <div className="h-[170px] flex items-center justify-center text-xs text-gray-400">
            Aucune donnée pour ce filtre
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  dataKey="value"
                  paddingAngle={2}
                  onClick={(entry) => { if (entry?.name) onSelect(entry.name as string); }}
                  style={{ cursor: 'pointer' }}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={selected === null || selected === entry.name ? 1 : 0.25}
                      stroke={selected === entry.name ? entry.color : 'transparent'}
                      strokeWidth={selected === entry.name ? 2 : 0}
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
        )}
      </div>
      <div className="mt-2 space-y-1">
        {data.map(d => (
          <button
            key={d.name}
            onClick={() => onSelect(d.name)}
            className={[
              'w-full flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded transition-colors',
              selected === d.name ? 'bg-gray-100' : 'hover:bg-gray-50',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.name}</span>
            </span>
            <span className="font-mono text-gray-600">
              {d.value} <span className="text-gray-400">({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <button
          onClick={() => onSelect(selected)}
          className="mt-2 w-full text-[11px] text-blue-500 hover:text-blue-700 text-center"
        >
          Réinitialiser le filtre ×
        </button>
      )}
    </div>
  );
}

function SuiviReleaseTab() {
  const [version, setVersion] = useState('FAH_26.20');
  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState<string | null>(null);

  const data = RELEASE_DATA[version];
  if (!data) return null;

  const stateColors = useMemo(
    () => Object.fromEntries(data.byState.map(s => [s.name, s.color])) as Record<string, string>,
    [data.byState],
  );
  const teamColors = useMemo(
    () => Object.fromEntries(data.byTeam.map(t => [t.name, t.color])) as Record<string, string>,
    [data.byTeam],
  );

  // Filtre global de la page (table + camemberts)
  const filteredBugs = useMemo(() =>
    data.bugs.filter((b) =>
      (!filterState || b.state === filterState) &&
      (!filterTeam || b.team === filterTeam),
    ),
    [data.bugs, filterState, filterTeam],
  );

  // Camembert état : suit le filtre équipe
  const statePieData = useMemo(() => {
    const source = data.bugs.filter((b) => !filterTeam || b.team === filterTeam);
    const counts = new Map<string, number>();

    for (const bug of source) {
      counts.set(bug.state, (counts.get(bug.state) ?? 0) + 1);
    }

    const ordered = data.byState.map((s) => s.name);
    const extras = [...counts.keys()].filter((name) => !ordered.includes(name));

    return [...ordered, ...extras]
      .filter((name) => (counts.get(name) ?? 0) > 0)
      .map((name) => ({
        name,
        value: counts.get(name) ?? 0,
        color: stateColors[name] ?? '#9CA3AF',
      }));
  }, [data.bugs, data.byState, filterTeam, stateColors]);

  // Camembert équipe : suit le filtre état
  const teamPieData = useMemo(() => {
    const source = data.bugs.filter((b) => !filterState || b.state === filterState);
    const counts = new Map<string, number>();

    for (const bug of source) {
      counts.set(bug.team, (counts.get(bug.team) ?? 0) + 1);
    }

    const ordered = data.byTeam.map((t) => t.name);
    const extras = [...counts.keys()].filter((name) => !ordered.includes(name));

    return [...ordered, ...extras]
      .filter((name) => (counts.get(name) ?? 0) > 0)
      .map((name) => ({
        name,
        value: counts.get(name) ?? 0,
        color: teamColors[name] ?? '#9CA3AF',
      }));
  }, [data.bugs, data.byTeam, filterState, teamColors]);

  function toggleState(name: string) {
    setFilterState((prev) => (prev === name ? null : name));
  }

  function toggleTeam(name: string) {
    setFilterTeam((prev) => (prev === name ? null : name));
  }

  function toggleBugFilter(bug: ReleaseBug) {
    if (filterState === bug.state && filterTeam === bug.team) {
      setFilterState(null);
      setFilterTeam(null);
      return;
    }

    setFilterState(bug.state);
    setFilterTeam(bug.team);
  }

  const hasFilter = filterState !== null || filterTeam !== null;

  return (
    <div>
      {/* Filtres */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Release :</span>
          <Select
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
              setFilterState(null);
              setFilterTeam(null);
            }}
            className="w-auto min-w-[160px]"
          >
            {VERSIONS_LIST.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </div>
        {hasFilter && (
          <button
            onClick={() => {
              setFilterState(null);
              setFilterTeam(null);
            }}
            className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded-full px-2.5 py-1"
          >
            Réinitialiser tous les filtres ×
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {filteredBugs.length} / {data.bugs.length} bug{data.bugs.length > 1 ? 's' : ''}
          {hasFilter ? ' (filtrés)' : ''}
        </span>
      </div>

      {/* Pie charts cliquables */}
      <div className="flex gap-4 mb-5">
        <ClickablePie data={statePieData} title="Par état — cliquer pour filtrer" selected={filterState} onSelect={toggleState} />
        <ClickablePie data={teamPieData} title="Par équipe — cliquer pour filtrer" selected={filterTeam} onSelect={toggleTeam} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-16">ID</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Titre</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-24">État</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-32">Équipe</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-28">Sprint</th>
            </tr>
          </thead>
          <tbody>
            {filteredBugs.map((bug) => {
              const rowActive = filterState === bug.state && filterTeam === bug.team;
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
                  <td className="px-4 py-2 text-gray-700 max-w-0" style={{ maxWidth: 420 }}>
                    <span className="truncate block" title={bug.title}>{bug.title}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={[
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border',
                        STATE_BADGE[bug.state] ?? 'bg-gray-50 text-gray-500',
                      ].join(' ')}
                    >
                      {bug.state}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{bug.team}</td>
                  <td className="px-4 py-2 font-mono text-gray-400 text-[10px]">{bug.sprint}</td>
                </tr>
              );
            })}
            {filteredBugs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">Aucun bug pour ces filtres</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab 4 : Bugs fermés par PI ───────────────────────────────────────────────

function ClosedByPiTab() {
  return (
    <div className="space-y-6">
      {/* Par produit */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm font-semibold text-[#0e1a38] mb-4">Par produit</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={CLOSED_PRODUIT} barCategoryGap="40%" barGap={2}
            margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="pi" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={ttStyle()} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            <Bar dataKey="live"           name="Live"            fill={C.live}           maxBarSize={14} radius={[2,2,0,0]} />
            <Bar dataKey="livePatch"      name="Live Patch"      fill={C.livePatch}      maxBarSize={14} radius={[2,2,0,0]} />
            <Bar dataKey="onpremise"      name="OnPremise"       fill={C.onpremise}      maxBarSize={14} radius={[2,2,0,0]} />
            <Bar dataKey="onpremisePatch" name="OnPremise Patch" fill={C.onpremisePatch} maxBarSize={14} radius={[2,2,0,0]} />
            <Bar dataKey="horsVersion"    name="Hors version"    fill={C.horsVersion}    maxBarSize={14} radius={[2,2,0,0]} />
            <Bar dataKey="nonCategorise"  name="Non catégorisé"  fill={C.nonCategorise}  maxBarSize={14} radius={[2,2,0,0]} />
            <Line type="monotone" dataKey="total" name="Total" stroke="#FCD34D" strokeWidth={2}
              strokeDasharray="5 3" dot={{ r: 4, fill: '#FCD34D', strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Par équipe */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm font-semibold text-[#0e1a38] mb-4">Par équipe</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={CLOSED_EQUIPE} barCategoryGap="40%" barGap={2}
            margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="pi" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={ttStyle()} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            {TEAMS_LIST.map(t => (
              <Bar key={t} dataKey={t} name={t} fill={C.teams[t]} maxBarSize={14} radius={[2,2,0,0]} />
            ))}
            <Line type="monotone" dataKey="total" name="Total" stroke="#FCD34D" strokeWidth={2}
              strokeDasharray="5 3" dot={{ r: 4, fill: '#FCD34D', strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Tab 5 : Backlogs équipes ─────────────────────────────────────────────────

function TeamBacklogCard({ t }: { t: TeamBacklog }) {
  const pct    = Math.round((t.gcBugs / t.objective) * 100);
  const over   = pct >= 100;
  const warn   = pct >= 80 && !over;
  const barCls = over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-green-500';
  const cntCls = over ? 'text-red-600' : warn ? 'text-amber-600' : 'text-green-600';

  return (
    <div className={`bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow ${
      over ? 'border-red-100' : warn ? 'border-amber-100' : 'border-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold text-[#0e1a38]">{t.team}</div>
        <div className={`text-xs font-mono font-bold ${cntCls}`}>
          {t.gcBugs} / {t.objective}
          {over && <span className="ml-1 text-[10px] bg-red-100 px-1 rounded">DÉPASSÉ</span>}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md">New {t.newBugs}</span>
        <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md">Active {t.activeBugs}</span>
        {(t.coBugs + t.iwBugs) > 0 && (
          <span className="text-[10px] bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded-md"
            title="CO/IW ne comptent pas dans l'objectif">+{t.coBugs + t.iwBugs} CO/IW</span>
        )}
      </div>
      <div className="space-y-1.5">
        {t.topVersions.map(v => (
          <div key={v.version} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono w-24 truncate shrink-0">{v.version || '(vide)'}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-200 rounded-full" style={{ width: `${Math.round((v.count / t.gcBugs) * 100)}%` }} />
            </div>
            <span className="text-[10px] font-mono text-gray-500 w-4 text-right shrink-0">{v.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamBacklogsTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">
          Bugs GC uniquement (hors [CO] et [IW]) — vérifié le dernier jeudi avant fin de sprint.
        </p>
        <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full shrink-0">
          ⚠ Objectifs à configurer dans Paramètres
        </span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {TEAM_BACKLOGS.map(t => <TeamBacklogCard key={t.team} t={t} />)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Kpis() {
  const [tab, setTab] = useState<TabKey>('defect-debt');

  return (
    <Layout title="KPIs & Suivi qualité">
      {/* Tab bar — sticky dans la zone scrollable */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 -mx-7 px-7 mb-6">
        <div className="flex gap-0.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-[#1E40AF] text-[#1E40AF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Bandeau données mockées */}
      <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5 inline-flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        Données mockées — branchement sur données réelles à venir
      </div>

      {tab === 'defect-debt'   && <DefectDebtTab />}
      {tab === 'backlog-evo'   && <BacklogEvoTab />}
      {tab === 'suivi-release' && <SuiviReleaseTab />}
      {tab === 'closed-by-pi' && <ClosedByPiTab />}
      {tab === 'team-backlogs' && <TeamBacklogsTab />}
    </Layout>
  );
}


